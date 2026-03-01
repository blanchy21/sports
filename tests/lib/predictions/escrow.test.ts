import {
  buildStakeEscrowOp,
  buildPayoutOps,
  buildFeeOps,
  buildRefundOps,
} from '@/lib/predictions/escrow';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';

function parsePayload(op: { json: string }) {
  return JSON.parse(op.json);
}

describe('buildStakeEscrowOp', () => {
  it('builds a transfer to the escrow account', () => {
    const op = buildStakeEscrowOp('alice', 50, 'pred-1', 'out-1');
    const payload = parsePayload(op);

    expect(op.required_auths).toContain('alice');
    expect(payload.contractPayload.to).toBe(PREDICTION_CONFIG.ESCROW_ACCOUNT);
    expect(payload.contractPayload.symbol).toBe(MEDALS_CONFIG.SYMBOL);
  });

  it('includes correct memo format', () => {
    const op = buildStakeEscrowOp('alice', 50, 'pred-1', 'out-1');
    const payload = parsePayload(op);

    expect(payload.contractPayload.memo).toBe('prediction-stake|pred-1|out-1');
  });

  it('formats quantity with correct precision', () => {
    const op = buildStakeEscrowOp('alice', 50, 'pred-1', 'out-1');
    const payload = parsePayload(op);

    // Should be formatted to MEDALS_CONFIG.PRECISION decimal places
    expect(payload.contractPayload.quantity).toMatch(/^\d+\.\d+$/);
  });
});

describe('buildPayoutOps', () => {
  it('builds a single payout operation', () => {
    const ops = buildPayoutOps([{ username: 'alice', amount: 90, predictionId: 'pred-1' }]);

    expect(ops).toHaveLength(1);
    const payload = parsePayload(ops[0]);
    expect(payload.contractPayload.to).toBe('alice');
    expect(payload.contractPayload.memo).toBe('prediction-payout|pred-1');
  });

  it('builds batch payout operations', () => {
    const ops = buildPayoutOps([
      { username: 'alice', amount: 54, predictionId: 'pred-1' },
      { username: 'bob', amount: 36, predictionId: 'pred-1' },
    ]);

    expect(ops).toHaveLength(2);
    expect(parsePayload(ops[0]).contractPayload.to).toBe('alice');
    expect(parsePayload(ops[1]).contractPayload.to).toBe('bob');
  });

  it('handles Decimal-like amounts with toNumber()', () => {
    const decimalLike = { toNumber: () => 42.5 };
    const ops = buildPayoutOps([
      { username: 'alice', amount: decimalLike, predictionId: 'pred-1' },
    ]);

    expect(ops).toHaveLength(1);
    const payload = parsePayload(ops[0]);
    // Amount should be formatted from 42.5
    expect(parseFloat(payload.contractPayload.quantity)).toBeCloseTo(42.5);
  });

  it('sends from escrow account', () => {
    const ops = buildPayoutOps([{ username: 'alice', amount: 90, predictionId: 'pred-1' }]);
    expect(ops[0].required_auths).toContain(PREDICTION_CONFIG.ESCROW_ACCOUNT);
  });
});

describe('buildFeeOps', () => {
  it('builds burn and reward operations', () => {
    const result = buildFeeOps(10, 'pred-1');

    expect(result.burn).not.toBeNull();
    expect(result.reward).not.toBeNull();

    const burnPayload = parsePayload(result.burn!);
    expect(burnPayload.contractPayload.to).toBe(PREDICTION_CONFIG.BURN_ACCOUNT);
    expect(burnPayload.contractPayload.memo).toBe('prediction-fee-burn|pred-1');

    const rewardPayload = parsePayload(result.reward!);
    expect(rewardPayload.contractPayload.to).toBe(PREDICTION_CONFIG.REWARDS_ACCOUNT);
    expect(rewardPayload.contractPayload.memo).toBe('prediction-fee-reward|pred-1');
  });

  it('splits fee according to BURN_SPLIT and REWARD_SPLIT', () => {
    const result = buildFeeOps(100, 'pred-1');

    const burnQty = parseFloat(parsePayload(result.burn!).contractPayload.quantity);
    const rewardQty = parseFloat(parsePayload(result.reward!).contractPayload.quantity);

    expect(burnQty).toBeCloseTo(100 * PREDICTION_CONFIG.BURN_SPLIT);
    expect(rewardQty).toBeCloseTo(100 * PREDICTION_CONFIG.REWARD_SPLIT);
  });

  it('returns null ops when fee is 0', () => {
    const result = buildFeeOps(0, 'pred-1');
    expect(result.burn).toBeNull();
    expect(result.reward).toBeNull();
  });

  it('sends from escrow account', () => {
    const result = buildFeeOps(10, 'pred-1');
    expect(result.burn!.required_auths).toContain(PREDICTION_CONFIG.ESCROW_ACCOUNT);
    expect(result.reward!.required_auths).toContain(PREDICTION_CONFIG.ESCROW_ACCOUNT);
  });
});

describe('buildRefundOps', () => {
  it('builds a single refund operation', () => {
    const ops = buildRefundOps([{ username: 'alice', amount: 50, predictionId: 'pred-1' }]);

    expect(ops).toHaveLength(1);
    const payload = parsePayload(ops[0]);
    expect(payload.contractPayload.to).toBe('alice');
    expect(payload.contractPayload.memo).toBe('prediction-refund|pred-1');
  });

  it('builds batch refund operations', () => {
    const ops = buildRefundOps([
      { username: 'alice', amount: 50, predictionId: 'pred-1' },
      { username: 'bob', amount: 30, predictionId: 'pred-1' },
      { username: 'carol', amount: 20, predictionId: 'pred-1' },
    ]);

    expect(ops).toHaveLength(3);
  });

  it('handles Decimal-like amounts', () => {
    const decimalLike = { toNumber: () => 75 };
    const ops = buildRefundOps([
      { username: 'alice', amount: decimalLike, predictionId: 'pred-1' },
    ]);

    expect(ops).toHaveLength(1);
    const payload = parsePayload(ops[0]);
    expect(parseFloat(payload.contractPayload.quantity)).toBeCloseTo(75);
  });

  it('sends from escrow account', () => {
    const ops = buildRefundOps([{ username: 'alice', amount: 50, predictionId: 'pred-1' }]);
    expect(ops[0].required_auths).toContain(PREDICTION_CONFIG.ESCROW_ACCOUNT);
  });
});
