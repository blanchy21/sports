import { PREDICTION_CONFIG } from './constants';
import type { PredictionOdds, SettlementResult, SettlementPayout } from './types';

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

  const payout = (stakeAmount / winningPool) * totalPool * (1 - feePct);
  return Math.round(payout * 1000) / 1000;
}

export function calculateSettlement(
  stakes: Array<{ id: string; username: string; outcomeId: string; amount: number }>,
  winningOutcomeId: string,
  totalPool: number
): SettlementResult {
  const feePct = PREDICTION_CONFIG.PLATFORM_FEE_PCT;
  const platformFee = Math.round(totalPool * feePct * 1000) / 1000;
  const burnAmount = Math.round(platformFee * PREDICTION_CONFIG.BURN_SPLIT * 1000) / 1000;
  const rewardAmount = Math.round(platformFee * PREDICTION_CONFIG.REWARD_SPLIT * 1000) / 1000;

  const winningStakes = stakes.filter((s) => s.outcomeId === winningOutcomeId);
  const winningPool = winningStakes.reduce((sum, s) => sum + s.amount, 0);

  const distributablePool = totalPool - platformFee;

  const payouts: SettlementPayout[] = winningStakes.map((s) => {
    const payoutAmount =
      winningPool > 0 ? Math.round((s.amount / winningPool) * distributablePool * 1000) / 1000 : 0;

    return {
      username: s.username,
      stakeId: s.id,
      amount: s.amount,
      payoutAmount,
    };
  });

  // Adjust rounding on largest payout so total_paid + fees = totalPool
  const totalPaid = payouts.reduce((sum, p) => sum + p.payoutAmount, 0);
  const expectedPaid = Math.round((totalPool - platformFee) * 1000) / 1000;
  const rounding = Math.round((expectedPaid - totalPaid) * 1000) / 1000;

  if (rounding !== 0 && payouts.length > 0) {
    // Find the largest payout to absorb rounding
    let largestIdx = 0;
    for (let i = 1; i < payouts.length; i++) {
      if (payouts[i].payoutAmount > payouts[largestIdx].payoutAmount) {
        largestIdx = i;
      }
    }
    payouts[largestIdx].payoutAmount =
      Math.round((payouts[largestIdx].payoutAmount + rounding) * 1000) / 1000;
  }

  const adjustedTotalPaid = payouts.reduce((sum, p) => sum + p.payoutAmount, 0);

  return {
    winningOutcomeId,
    totalPool,
    winningPool,
    platformFee,
    burnAmount,
    rewardAmount,
    payouts,
    totalPaid: Math.round(adjustedTotalPaid * 1000) / 1000,
  };
}
