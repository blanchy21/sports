import { Prisma } from '@/generated/prisma/client';
import { PREDICTION_CONFIG } from './constants';
import type { PredictionOdds, SettlementResult, SettlementPayout } from './types';

type Decimal = Prisma.Decimal;
const D = (v: Prisma.Decimal | number | string) => new Prisma.Decimal(v);
const ZERO = D(0);
const PLACES = 3; // DB precision: Decimal(12,3)

export function calculateOdds(
  totalPool: number,
  outcomePool: number,
  feePct: number = PREDICTION_CONFIG.PLATFORM_FEE_PCT
): PredictionOdds {
  if (totalPool <= 0) {
    return { multiplier: 0, percentage: 0, impliedProbability: 0 };
  }

  const multiplier = outcomePool > 0 ? (totalPool * (1 - feePct)) / outcomePool : 0;
  const percentage = (outcomePool / totalPool) * 100;
  const impliedProbability = outcomePool / totalPool;

  return { multiplier, percentage, impliedProbability };
}

export function calculatePayout(
  stakeAmount: number,
  totalPool: number,
  winningPool: number,
  feePct: number = PREDICTION_CONFIG.PLATFORM_FEE_PCT
): number {
  if (winningPool <= 0) return 0;

  const payout = D(stakeAmount)
    .div(D(winningPool))
    .mul(D(totalPool))
    .mul(D(1 - feePct))
    .toDecimalPlaces(PLACES);
  return payout.toNumber();
}

/**
 * Calculate settlement payouts using Decimal arithmetic throughout.
 * Accepts Decimal amounts from Prisma and only converts to number in the final result.
 */
export function calculateSettlement(
  stakes: Array<{ id: string; username: string; outcomeId: string; amount: Decimal | number }>,
  winningOutcomeId: string,
  totalPool: Decimal | number
): SettlementResult {
  const pool = D(totalPool);
  const feePct = D(PREDICTION_CONFIG.PLATFORM_FEE_PCT);

  const platformFee = pool.mul(feePct).toDecimalPlaces(PLACES);
  const burnAmount = platformFee.mul(D(PREDICTION_CONFIG.BURN_SPLIT)).toDecimalPlaces(PLACES);
  const rewardAmount = platformFee.mul(D(PREDICTION_CONFIG.REWARD_SPLIT)).toDecimalPlaces(PLACES);

  const winningStakes = stakes.filter((s) => s.outcomeId === winningOutcomeId);
  const winningPool = winningStakes.reduce((sum, s) => sum.add(D(s.amount)), ZERO);

  const distributablePool = pool.minus(platformFee);

  const payouts: (SettlementPayout & { _payout: Decimal })[] = winningStakes.map((s) => {
    const amt = D(s.amount);
    const payoutAmount = winningPool.gt(ZERO)
      ? amt.div(winningPool).mul(distributablePool).toDecimalPlaces(PLACES)
      : ZERO;

    return {
      username: s.username,
      stakeId: s.id,
      amount: amt.toNumber(),
      payoutAmount: payoutAmount.toNumber(),
      _payout: payoutAmount,
    };
  });

  // Adjust rounding on largest payout so total_paid + fees = totalPool exactly
  const totalPaid = payouts.reduce((sum, p) => sum.add(p._payout), ZERO);
  const remainder = distributablePool.minus(totalPaid);

  if (!remainder.isZero() && payouts.length > 0) {
    let largestIdx = 0;
    for (let i = 1; i < payouts.length; i++) {
      if (payouts[i]._payout.gt(payouts[largestIdx]._payout)) {
        largestIdx = i;
      }
    }
    const adjusted = payouts[largestIdx]._payout.add(remainder).toDecimalPlaces(PLACES);
    payouts[largestIdx]._payout = adjusted;
    payouts[largestIdx].payoutAmount = adjusted.toNumber();
  }

  const adjustedTotalPaid = payouts.reduce((sum, p) => sum.add(p._payout), ZERO);

  // Strip internal _payout field from result
  const cleanPayouts: SettlementPayout[] = payouts.map(({ _payout, ...rest }) => rest);

  return {
    winningOutcomeId,
    totalPool: pool.toNumber(),
    winningPool: winningPool.toNumber(),
    platformFee: platformFee.toNumber(),
    burnAmount: burnAmount.toNumber(),
    rewardAmount: rewardAmount.toNumber(),
    payouts: cleanPayouts,
    totalPaid: adjustedTotalPaid.toDecimalPlaces(PLACES).toNumber(),
  };
}
