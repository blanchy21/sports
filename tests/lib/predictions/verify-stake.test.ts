// Mock dhive before importing the module under test
jest.mock('@hiveio/dhive', () => ({
  Client: jest.fn().mockImplementation(() => ({
    database: {
      getTransaction: jest.fn(),
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
