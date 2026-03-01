import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { FakeDecimal } from '../../__mocks__/prisma-client';
import { calculateOdds, calculatePayout, calculateSettlement } from '@/lib/predictions/odds';

describe('calculateOdds', () => {
  it('returns zeros when total pool is 0', () => {
    const result = calculateOdds(0, 0);
    expect(result).toEqual({ multiplier: 0, percentage: 0, impliedProbability: 0 });
  });

  it('returns zeros when total pool is negative', () => {
    const result = calculateOdds(-100, 50);
    expect(result).toEqual({ multiplier: 0, percentage: 0, impliedProbability: 0 });
  });

  it('returns zero multiplier when outcome pool is 0', () => {
    const result = calculateOdds(100, 0);
    expect(result.multiplier).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.impliedProbability).toBe(0);
  });

  it('calculates correct odds with equal stakes', () => {
    const result = calculateOdds(100, 50);
    expect(result.multiplier).toBeCloseTo(1.8);
    expect(result.percentage).toBe(50);
    expect(result.impliedProbability).toBe(0.5);
  });

  it('calculates correct odds with lopsided stakes', () => {
    const result = calculateOdds(100, 10);
    expect(result.multiplier).toBeCloseTo(9.0);
    expect(result.percentage).toBe(10);
    expect(result.impliedProbability).toBe(0.1);
  });

  it('calculates correct odds with favorite', () => {
    const result = calculateOdds(100, 90);
    expect(result.multiplier).toBeCloseTo(1.0);
    expect(result.percentage).toBe(90);
    expect(result.impliedProbability).toBe(0.9);
  });

  it('respects custom fee percentage', () => {
    const result = calculateOdds(100, 50, 0.05);
    expect(result.multiplier).toBeCloseTo(1.9);
  });

  it('handles zero fee', () => {
    const result = calculateOdds(100, 50, 0);
    expect(result.multiplier).toBe(2.0);
  });
});

describe('calculatePayout', () => {
  it('returns 0 when winning pool is 0', () => {
    expect(calculatePayout(50, 100, 0)).toBe(0);
  });

  it('returns 0 when winning pool is negative', () => {
    expect(calculatePayout(50, 100, -10)).toBe(0);
  });

  it('calculates single winner payout correctly', () => {
    const payout = calculatePayout(50, 100, 50);
    expect(payout).toBeCloseTo(90);
  });

  it('calculates proportional payout for multiple winners', () => {
    const payout = calculatePayout(30, 200, 60);
    expect(payout).toBeCloseTo(90);
  });

  it('uses default fee from config', () => {
    const payout = calculatePayout(100, 200, 100);
    expect(payout).toBeCloseTo(180);
  });

  it('handles custom fee percentage', () => {
    const payout = calculatePayout(100, 200, 100, 0.2);
    expect(payout).toBeCloseTo(160);
  });
});

describe('calculateSettlement', () => {
  const FEE_PCT = PREDICTION_CONFIG.PLATFORM_FEE_PCT;
  const BURN_SPLIT = PREDICTION_CONFIG.BURN_SPLIT;
  const REWARD_SPLIT = PREDICTION_CONFIG.REWARD_SPLIT;

  it('calculates settlement for a single winner', () => {
    const stakes = [
      { id: 's1', username: 'alice', outcomeId: 'a', amount: 50 },
      { id: 's2', username: 'bob', outcomeId: 'b', amount: 50 },
    ];
    const result = calculateSettlement(stakes, 'a', 100);

    expect(result.winningOutcomeId).toBe('a');
    expect(result.totalPool).toBe(100);
    expect(result.winningPool).toBe(50);
    expect(result.platformFee).toBeCloseTo(100 * FEE_PCT);
    expect(result.burnAmount).toBeCloseTo(100 * FEE_PCT * BURN_SPLIT);
    expect(result.rewardAmount).toBeCloseTo(100 * FEE_PCT * REWARD_SPLIT);

    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].username).toBe('alice');
    expect(result.payouts[0].payoutAmount).toBeCloseTo(90);
  });

  it('calculates settlement for multiple winners', () => {
    const stakes = [
      { id: 's1', username: 'alice', outcomeId: 'a', amount: 30 },
      { id: 's2', username: 'bob', outcomeId: 'a', amount: 20 },
      { id: 's3', username: 'charlie', outcomeId: 'b', amount: 50 },
    ];
    const result = calculateSettlement(stakes, 'a', 100);

    expect(result.payouts).toHaveLength(2);

    const alicePayout = result.payouts.find((p) => p.username === 'alice');
    const bobPayout = result.payouts.find((p) => p.username === 'bob');

    expect(alicePayout!.payoutAmount).toBeCloseTo(54);
    expect(bobPayout!.payoutAmount).toBeCloseTo(36);
  });

  it('adjusts rounding remainder on largest payout', () => {
    const stakes = [
      { id: 's1', username: 'alice', outcomeId: 'a', amount: 33 },
      { id: 's2', username: 'bob', outcomeId: 'a', amount: 33 },
      { id: 's3', username: 'charlie', outcomeId: 'a', amount: 34 },
      { id: 's4', username: 'dave', outcomeId: 'b', amount: 100 },
    ];
    const result = calculateSettlement(stakes, 'a', 200);

    const totalPaidPlusFee = result.totalPaid + result.platformFee;
    expect(totalPaidPlusFee).toBeCloseTo(200, 2);
  });

  it('handles no winning stakes', () => {
    const stakes = [
      { id: 's1', username: 'alice', outcomeId: 'a', amount: 50 },
      { id: 's2', username: 'bob', outcomeId: 'b', amount: 50 },
    ];
    const result = calculateSettlement(stakes, 'c', 100);

    expect(result.payouts).toHaveLength(0);
    expect(result.winningPool).toBe(0);
    expect(result.totalPaid).toBe(0);
  });

  it('accepts Decimal amounts from Prisma', () => {
    const stakes = [
      { id: 's1', username: 'alice', outcomeId: 'a', amount: new FakeDecimal(50) as never },
      { id: 's2', username: 'bob', outcomeId: 'b', amount: new FakeDecimal(50) as never },
    ];
    const result = calculateSettlement(stakes, 'a', new FakeDecimal(100) as never);

    expect(result.totalPool).toBe(100);
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].payoutAmount).toBeCloseTo(90);
  });

  it('strips internal _payout field from results', () => {
    const stakes = [
      { id: 's1', username: 'alice', outcomeId: 'a', amount: 50 },
      { id: 's2', username: 'bob', outcomeId: 'b', amount: 50 },
    ];
    const result = calculateSettlement(stakes, 'a', 100);

    for (const payout of result.payouts) {
      expect(payout).not.toHaveProperty('_payout');
    }
  });
});
