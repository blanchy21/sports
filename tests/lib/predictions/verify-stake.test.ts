// Mock dhive before importing the module under test
const mockCall = jest.fn();
jest.mock('@hiveio/dhive', () => ({
  Client: jest.fn().mockImplementation(() => ({
    database: {
      getTransaction: jest.fn(),
      call: mockCall,
    },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { Client } from '@hiveio/dhive';
import { verifyStakeTransaction } from '@/lib/predictions/verify-stake';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';

// Access the mock getTransaction
const mockClient = (Client as jest.MockedClass<typeof Client>).mock.results[0].value as unknown as {
  database: { getTransaction: jest.Mock };
};
const getTransaction = mockClient.database.getTransaction;

function makeValidTx(
  overrides: {
    sender?: string;
    amount?: string;
    memo?: string;
    symbol?: string;
    to?: string;
    contractName?: string;
    contractAction?: string;
    engineId?: string;
  } = {}
) {
  const {
    sender = 'alice',
    amount = '50.000000',
    memo = 'prediction-stake|pred-1|out-1',
    symbol = MEDALS_CONFIG.SYMBOL,
    to = PREDICTION_CONFIG.ESCROW_ACCOUNT,
    contractName = 'tokens',
    contractAction = 'transfer',
    engineId = 'ssc-mainnet-hive',
  } = overrides;

  return {
    operations: [
      [
        'custom_json',
        {
          id: engineId,
          required_auths: [sender],
          required_posting_auths: [],
          json: JSON.stringify({
            contractName,
            contractAction,
            contractPayload: { symbol, to, quantity: amount, memo },
          }),
        },
      ],
    ],
  };
}

const BASE_PARAMS = {
  txId: 'abc123',
  expectedUsername: 'alice',
  expectedAmount: 50,
  expectedPredictionId: 'pred-1',
  expectedOutcomeId: 'out-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('verifyStakeTransaction', () => {
  it('passes all checks for a valid transaction', async () => {
    getTransaction.mockResolvedValue(makeValidTx());

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result).toEqual({ valid: true });
  });

  it('returns error when transaction not found after retries', async () => {
    getTransaction.mockResolvedValue(null);

    const promise = verifyStakeTransaction(BASE_PARAMS);

    // Fast-forward through retry delays
    for (let i = 0; i < 4; i++) {
      await jest.advanceTimersByTimeAsync(10000);
    }

    const result = await promise;
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error on amount mismatch', async () => {
    getTransaction.mockResolvedValue(makeValidTx({ amount: '999.000000' }));

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Amount mismatch');
    expect(result.error).toContain('999');
    expect(result.error).toContain('50');
  });

  it('returns error on memo mismatch', async () => {
    getTransaction.mockResolvedValue(makeValidTx({ memo: 'wrong-memo' }));

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Memo mismatch');
  });

  it('rejects wrong sender', async () => {
    getTransaction.mockResolvedValue(makeValidTx({ sender: 'mallory' }));

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching stake transfer');
  });

  it('skips non-Hive-Engine custom_json operations', async () => {
    getTransaction.mockResolvedValue(makeValidTx({ engineId: 'some-other-id' }));

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching stake transfer');
  });

  it('skips non-transfer operations', async () => {
    getTransaction.mockResolvedValue(
      makeValidTx({ contractName: 'tokens', contractAction: 'stake' })
    );

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching stake transfer');
  });

  it('retries on fetch error and succeeds', async () => {
    getTransaction
      .mockRejectedValueOnce(new Error('Node timeout'))
      .mockResolvedValueOnce(makeValidTx());

    const promise = verifyStakeTransaction(BASE_PARAMS);

    // Advance through retry delay
    await jest.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result.valid).toBe(true);
    expect(getTransaction).toHaveBeenCalledTimes(2);
  });

  it('propagates node error on final retry', async () => {
    getTransaction.mockRejectedValue(new Error('Persistent node failure'));

    const promise = verifyStakeTransaction(BASE_PARAMS);

    // Advance through all retry delays
    for (let i = 0; i < 4; i++) {
      await jest.advanceTimersByTimeAsync(10000);
    }

    const result = await promise;
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Persistent node failure');
  });

  it('skips operations with invalid JSON payload', async () => {
    const tx = {
      operations: [
        [
          'custom_json',
          {
            id: 'ssc-mainnet-hive',
            required_auths: ['alice'],
            required_posting_auths: [],
            json: '{invalid json',
          },
        ],
      ],
    };
    getTransaction.mockResolvedValue(tx);

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching stake transfer');
  });

  it('skips non-custom_json operations in the transaction', async () => {
    const tx = {
      operations: [
        ['transfer', { from: 'alice', to: 'bob', amount: '1.000 HIVE' }],
        ...makeValidTx().operations,
      ],
    };
    getTransaction.mockResolvedValue(tx);

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(true);
  });

  it('rejects wrong token symbol', async () => {
    getTransaction.mockResolvedValue(makeValidTx({ symbol: 'WRONG' }));

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching stake transfer');
  });

  it('rejects wrong recipient', async () => {
    getTransaction.mockResolvedValue(makeValidTx({ to: 'wrong-account' }));

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No matching stake transfer');
  });
});

// =========================================================================
// Account history fallback (HiveSigner placeholder txId)
// =========================================================================

const PLACEHOLDER_PARAMS = {
  ...BASE_PARAMS,
  txId: 'hivesigner-signed',
};

function makeHistoryEntry(
  overrides: {
    sender?: string;
    amount?: string;
    memo?: string;
    symbol?: string;
    to?: string;
    timestamp?: string;
  } = {}
) {
  const {
    sender = 'alice',
    amount = '50.000000',
    memo = 'prediction-stake|pred-1|out-1',
    symbol = MEDALS_CONFIG.SYMBOL,
    to = PREDICTION_CONFIG.ESCROW_ACCOUNT,
    timestamp = new Date().toISOString().replace('Z', ''), // UTC without Z suffix
  } = overrides;

  return [
    1, // sequence number
    {
      op: [
        'custom_json',
        {
          id: 'ssc-mainnet-hive',
          required_auths: [sender],
          required_posting_auths: [],
          json: JSON.stringify({
            contractName: 'tokens',
            contractAction: 'transfer',
            contractPayload: { symbol, to, quantity: amount, memo },
          }),
        },
      ],
      timestamp,
    },
  ];
}

describe('verifyStakeTransaction — account history fallback', () => {
  it('routes to account history when txId is placeholder', async () => {
    mockCall.mockResolvedValue([makeHistoryEntry()]);

    const promise = verifyStakeTransaction(PLACEHOLDER_PARAMS);

    // Initial delay (5s) before first history scan
    await jest.advanceTimersByTimeAsync(6000);

    const result = await promise;
    expect(result.valid).toBe(true);
    expect(getTransaction).not.toHaveBeenCalled(); // Should NOT call getTransaction
    expect(mockCall).toHaveBeenCalledWith('condenser_api', 'get_account_history', [
      'alice',
      -1,
      50,
      1 << 18,
    ]);
  });

  it('validates amount in history entry', async () => {
    mockCall.mockResolvedValue([makeHistoryEntry({ amount: '999.000000' })]);

    const promise = verifyStakeTransaction(PLACEHOLDER_PARAMS);
    await jest.advanceTimersByTimeAsync(6000);

    const result = await promise;
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Amount mismatch');
  });

  it('validates memo in history entry', async () => {
    mockCall.mockResolvedValue([makeHistoryEntry({ memo: 'wrong-memo' })]);

    const promise = verifyStakeTransaction(PLACEHOLDER_PARAMS);
    await jest.advanceTimersByTimeAsync(6000);

    const result = await promise;
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Memo mismatch');
  });

  it('skips entries older than 2 minutes', async () => {
    const oldTimestamp = new Date(Date.now() - 180_000).toISOString().replace('Z', '');
    mockCall.mockResolvedValue([makeHistoryEntry({ timestamp: oldTimestamp })]);

    const promise = verifyStakeTransaction(PLACEHOLDER_PARAMS);

    // Advance through all 5 attempts (5s + 4×4s = 21s)
    for (let i = 0; i < 6; i++) {
      await jest.advanceTimersByTimeAsync(5000);
    }

    const result = await promise;
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found in recent account history');
  });

  it('retries when history is empty and eventually finds the tx', async () => {
    mockCall
      .mockResolvedValueOnce([]) // first attempt: empty
      .mockResolvedValueOnce([makeHistoryEntry()]); // second attempt: found

    const promise = verifyStakeTransaction(PLACEHOLDER_PARAMS);

    // First attempt (5s delay)
    await jest.advanceTimersByTimeAsync(6000);
    // Second attempt (4s delay)
    await jest.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result.valid).toBe(true);
    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it('returns error after all retries fail', async () => {
    mockCall.mockRejectedValue(new Error('Node unavailable'));

    const promise = verifyStakeTransaction(PLACEHOLDER_PARAMS);

    // Advance through all 5 attempts
    for (let i = 0; i < 6; i++) {
      await jest.advanceTimersByTimeAsync(6000);
    }

    const result = await promise;
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Failed to verify stake via account history');
  });

  it('skips non-custom_json ops in history', async () => {
    const entry = [
      1,
      {
        op: ['transfer', { from: 'alice', to: 'bob', amount: '1.000 HIVE' }],
        timestamp: new Date().toISOString().replace('Z', ''),
      },
    ];
    // Return a non-custom_json entry followed by empty — should not match
    mockCall.mockResolvedValue([entry]);

    const promise = verifyStakeTransaction(PLACEHOLDER_PARAMS);

    for (let i = 0; i < 6; i++) {
      await jest.advanceTimersByTimeAsync(6000);
    }

    const result = await promise;
    expect(result.valid).toBe(false);
  });

  it('does not use account history for real txIds', async () => {
    getTransaction.mockResolvedValue(makeValidTx());

    const result = await verifyStakeTransaction(BASE_PARAMS);
    expect(result.valid).toBe(true);
    expect(mockCall).not.toHaveBeenCalled();
  });
});
