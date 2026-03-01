import { FakeDecimal } from '../../__mocks__/prisma-client';

// Mock prisma before importing settlement
jest.mock('@/lib/db/prisma', () => {
  const mockTx = {
    predictionStake: { update: jest.fn().mockResolvedValue({}) },
    predictionOutcome: { update: jest.fn().mockResolvedValue({}) },
    prediction: { update: jest.fn().mockResolvedValue({}) },
  };

  return {
    prisma: {
      prediction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      predictionStake: {
        update: jest.fn().mockResolvedValue({}),
      },
      predictionOutcome: {
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
      _mockTx: mockTx,
    },
  };
});

// Mock dhive
jest.mock('@hiveio/dhive', () => ({
  Client: jest.fn().mockImplementation(() => ({
    broadcast: { sendOperations: jest.fn().mockResolvedValue({ id: 'mock-tx-id' }) },
  })),
  PrivateKey: { fromString: jest.fn().mockReturnValue('mock-key') },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '@/lib/db/prisma';
import {
  executeSettlement,
  executeVoidRefund,
  broadcastHiveEngineOps,
} from '@/lib/predictions/settlement';

const mockPrisma = prisma as unknown as {
  prediction: {
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  predictionStake: { update: jest.Mock };
  predictionOutcome: { update: jest.Mock };
  $transaction: jest.Mock;
  _mockTx: {
    predictionStake: { update: jest.Mock };
    predictionOutcome: { update: jest.Mock };
    prediction: { update: jest.Mock };
  };
};

function makePrediction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pred-1',
    status: 'SETTLING',
    totalPool: new FakeDecimal(200),
    feeBurnTxId: null,
    feeRewardTxId: null,
    outcomes: [
      { id: 'out-a', label: 'Team A', totalStaked: new FakeDecimal(100), backerCount: 1 },
      { id: 'out-b', label: 'Team B', totalStaked: new FakeDecimal(100), backerCount: 1 },
    ],
    stakes: [
      {
        id: 'stake-1',
        username: 'alice',
        outcomeId: 'out-a',
        amount: new FakeDecimal(100),
        payoutTxId: null,
        refundTxId: null,
      },
      {
        id: 'stake-2',
        username: 'bob',
        outcomeId: 'out-b',
        amount: new FakeDecimal(100),
        payoutTxId: null,
        refundTxId: null,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SP_PREDICTIONS_ACTIVE_KEY = '5JFake';
  // Default: updateMany succeeds (LOCKED → SETTLING transition)
  mockPrisma.prediction.updateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  delete process.env.SP_PREDICTIONS_ACTIVE_KEY;
});

describe('executeSettlement', () => {
  it('settles normally with correct payouts and fees', async () => {
    const pred = makePrediction();
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    const result = await executeSettlement('pred-1', 'out-a', 'admin');

    // Platform fee = 10% of 200 = 20
    expect(result.platformFee).toBeCloseTo(20);
    expect(result.burnAmount).toBeCloseTo(10);
    expect(result.rewardAmount).toBeCloseTo(10);

    // Alice staked 100 on winning outcome, total pool 200, winning pool 100
    // Payout = (100/100) * 200 * 0.9 = 180
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].username).toBe('alice');
    expect(result.payouts[0].payoutAmount).toBeCloseTo(180);

    // Verify DB was updated to SETTLED
    expect(mockPrisma._mockTx.prediction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SETTLED', winningOutcomeId: 'out-a' }),
      })
    );
  });

  it('refunds all stakes when all on same outcome (no opposing bets)', async () => {
    const pred = makePrediction({
      stakes: [
        {
          id: 'stake-1',
          username: 'alice',
          outcomeId: 'out-a',
          amount: new FakeDecimal(100),
          payoutTxId: null,
          refundTxId: null,
        },
        {
          id: 'stake-2',
          username: 'bob',
          outcomeId: 'out-a',
          amount: new FakeDecimal(100),
          payoutTxId: null,
          refundTxId: null,
        },
      ],
    });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    const result = await executeSettlement('pred-1', 'out-a', 'admin');

    // Should refund — no fees
    expect(result.platformFee).toBe(0);
    expect(result.burnAmount).toBe(0);

    // Each stake should be marked refunded
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'stake-1' }, data: { refundTxId: 'mock-tx-id' } })
    );

    // Status should be REFUNDED
    expect(mockPrisma._mockTx.prediction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REFUNDED' }),
      })
    );
  });

  it('refunds when no backers on winning outcome', async () => {
    // Add a third outcome that nobody staked on
    const pred = makePrediction({
      outcomes: [
        { id: 'out-a', label: 'Team A', totalStaked: new FakeDecimal(100), backerCount: 1 },
        { id: 'out-b', label: 'Team B', totalStaked: new FakeDecimal(100), backerCount: 1 },
        { id: 'out-c', label: 'Draw', totalStaked: new FakeDecimal(0), backerCount: 0 },
      ],
    });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    // out-c is a valid outcome but nobody staked on it
    const result = await executeSettlement('pred-1', 'out-c', 'admin');

    expect(result.platformFee).toBe(0);
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledTimes(2);
  });

  it('skips already-sent payouts (idempotency)', async () => {
    const pred = makePrediction({
      stakes: [
        {
          id: 'stake-1',
          username: 'alice',
          outcomeId: 'out-a',
          amount: new FakeDecimal(100),
          payoutTxId: 'already-paid-tx',
          refundTxId: null,
        },
        {
          id: 'stake-2',
          username: 'bob',
          outcomeId: 'out-b',
          amount: new FakeDecimal(100),
          payoutTxId: null,
          refundTxId: null,
        },
      ],
    });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    await executeSettlement('pred-1', 'out-a', 'admin');

    // Alice's payout was already sent, so predictionStake.update should NOT be called for stake-1
    // (only the $transaction updates will touch stake-1)
    const stakeUpdateCalls = mockPrisma.predictionStake.update.mock.calls;
    const directStakeUpdates = stakeUpdateCalls.filter(
      (call: Array<{ where: { id: string } }>) => call[0].where.id === 'stake-1'
    );
    expect(directStakeUpdates).toHaveLength(0);
  });

  it('skips already-refunded stakes (idempotency)', async () => {
    const pred = makePrediction({
      stakes: [
        {
          id: 'stake-1',
          username: 'alice',
          outcomeId: 'out-a',
          amount: new FakeDecimal(100),
          payoutTxId: null,
          refundTxId: 'existing-refund-tx',
        },
        {
          id: 'stake-2',
          username: 'bob',
          outcomeId: 'out-a',
          amount: new FakeDecimal(100),
          payoutTxId: null,
          refundTxId: null,
        },
      ],
    });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    await executeSettlement('pred-1', 'out-a', 'admin');

    // Only bob's stake should get a refund broadcast
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'stake-2' } })
    );
  });

  it('continues from SETTLING state (retry)', async () => {
    // updateMany returns 0 (already past LOCKED)
    mockPrisma.prediction.updateMany.mockResolvedValue({ count: 0 });
    // But findUnique shows it's SETTLING (valid retry)
    mockPrisma.prediction.findUnique
      .mockResolvedValueOnce({ status: 'SETTLING' })
      .mockResolvedValueOnce(makePrediction());

    const result = await executeSettlement('pred-1', 'out-a', 'admin');
    expect(result.payouts).toHaveLength(1);
  });

  it('throws for non-LOCKED/non-SETTLING predictions', async () => {
    mockPrisma.prediction.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.prediction.findUnique.mockResolvedValue({ status: 'SETTLED' });

    await expect(executeSettlement('pred-1', 'out-a', 'admin')).rejects.toThrow(
      'must be LOCKED for settlement'
    );
  });

  it('throws for non-existent winning outcome', async () => {
    const pred = makePrediction();
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    await expect(executeSettlement('pred-1', 'nonexistent', 'admin')).rejects.toThrow(
      'Invalid winning outcome'
    );
  });

  it('throws when prediction not found', async () => {
    mockPrisma.prediction.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.prediction.findUnique.mockResolvedValue(null);

    await expect(executeSettlement('pred-1', 'out-a', 'admin')).rejects.toThrow(
      'Prediction not found'
    );
  });

  it('skips fee burn when already broadcast', async () => {
    const pred = makePrediction({ feeBurnTxId: 'already-burned' });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    await executeSettlement('pred-1', 'out-a', 'admin');

    // prediction.update should NOT be called for feeBurnTxId
    const predUpdateCalls = mockPrisma.prediction.update.mock.calls;
    const burnUpdates = predUpdateCalls.filter(
      (call: Array<{ data: { feeBurnTxId?: string } }>) => call[0].data.feeBurnTxId
    );
    expect(burnUpdates).toHaveLength(0);
  });

  it('skips fee reward when already broadcast', async () => {
    const pred = makePrediction({ feeRewardTxId: 'already-rewarded' });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    await executeSettlement('pred-1', 'out-a', 'admin');

    const predUpdateCalls = mockPrisma.prediction.update.mock.calls;
    const rewardUpdates = predUpdateCalls.filter(
      (call: Array<{ data: { feeRewardTxId?: string } }>) => call[0].data.feeRewardTxId
    );
    expect(rewardUpdates).toHaveLength(0);
  });
});

describe('executeVoidRefund', () => {
  beforeEach(() => {
    // Default: updateMany succeeds (OPEN/LOCKED → VOID transition)
    mockPrisma.prediction.updateMany.mockResolvedValue({ count: 1 });
  });

  it('refunds all stakes and transitions to REFUNDED', async () => {
    const pred = makePrediction({ status: 'OPEN' });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    await executeVoidRefund('pred-1', 'Event cancelled', 'admin');

    // Both stakes should be refunded
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'stake-1' }, data: { refundTxId: 'mock-tx-id' } })
    );
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'stake-2' }, data: { refundTxId: 'mock-tx-id' } })
    );

    // Final status should be REFUNDED
    expect(mockPrisma._mockTx.prediction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REFUNDED' }),
      })
    );
  });

  it('skips already-refunded stakes (idempotency)', async () => {
    const pred = makePrediction({
      stakes: [
        {
          id: 'stake-1',
          username: 'alice',
          outcomeId: 'out-a',
          amount: new FakeDecimal(100),
          payoutTxId: null,
          refundTxId: 'existing-refund-tx',
        },
        {
          id: 'stake-2',
          username: 'bob',
          outcomeId: 'out-b',
          amount: new FakeDecimal(100),
          payoutTxId: null,
          refundTxId: null,
        },
      ],
    });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);

    await executeVoidRefund('pred-1', 'Event cancelled', 'admin');

    // Only bob's stake should get refunded
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.predictionStake.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'stake-2' } })
    );
  });

  it('throws for SETTLED predictions', async () => {
    const pred = makePrediction({ status: 'SETTLED' });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);
    mockPrisma.prediction.updateMany.mockResolvedValue({ count: 0 });

    await expect(executeVoidRefund('pred-1', 'reason', 'admin')).rejects.toThrow(
      'Cannot void prediction in SETTLED status'
    );
  });

  it('continues from VOID state (retry)', async () => {
    const pred = makePrediction({ status: 'VOID' });
    mockPrisma.prediction.findUnique.mockResolvedValue(pred);
    mockPrisma.prediction.updateMany.mockResolvedValue({ count: 0 });

    // Should not throw — VOID is a valid retry state
    await executeVoidRefund('pred-1', 'Event cancelled', 'admin');

    expect(mockPrisma.predictionStake.update).toHaveBeenCalledTimes(2);
  });

  it('throws when prediction not found', async () => {
    mockPrisma.prediction.findUnique.mockResolvedValue(null);

    await expect(executeVoidRefund('pred-1', 'reason', 'admin')).rejects.toThrow(
      'Prediction not found'
    );
  });
});

describe('broadcastHiveEngineOps', () => {
  it('throws when SP_PREDICTIONS_ACTIVE_KEY is not set', async () => {
    delete process.env.SP_PREDICTIONS_ACTIVE_KEY;

    await expect(
      broadcastHiveEngineOps([
        {
          id: 'ssc-mainnet-hive',
          required_auths: ['test'],
          required_posting_auths: [],
          json: '{}',
        },
      ])
    ).rejects.toThrow('SP_PREDICTIONS_ACTIVE_KEY is not configured');
  });
});
