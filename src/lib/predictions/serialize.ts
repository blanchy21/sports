import type { Prediction, PredictionOutcome, PredictionStake } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { PredictionBite, PredictionOutcomeResponse, UserStakeInfo } from './types';
import { calculateOdds } from './odds';

export function decimalToNumber(d: Prisma.Decimal | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return d.toNumber();
}

export function serializePrediction(
  prediction: Prediction & { outcomes: PredictionOutcome[]; stakes?: PredictionStake[] },
  currentUsername?: string
): PredictionBite {
  const totalPool = decimalToNumber(prediction.totalPool);

  const outcomes: PredictionOutcomeResponse[] = prediction.outcomes.map((outcome) => {
    const outcomeStaked = decimalToNumber(outcome.totalStaked);
    const odds = calculateOdds(totalPool, outcomeStaked);

    return {
      id: outcome.id,
      label: outcome.label,
      totalStaked: outcomeStaked,
      backerCount: outcome.backerCount,
      isWinner: outcome.isWinner,
      odds: odds.multiplier,
      percentage: odds.percentage,
    };
  });

  let userStakes: UserStakeInfo[] | undefined;
  if (currentUsername && prediction.stakes) {
    const filtered = prediction.stakes.filter((s) => s.username === currentUsername);
    if (filtered.length > 0) {
      userStakes = filtered.map((s) => ({
        outcomeId: s.outcomeId,
        amount: decimalToNumber(s.amount),
        payout: s.payout ? decimalToNumber(s.payout) : null,
        refunded: s.refunded,
      }));
    }
  }

  const bite: PredictionBite = {
    id: prediction.id,
    creatorUsername: prediction.creatorUsername,
    title: prediction.title,
    sportCategory: prediction.sportCategory,
    matchReference: prediction.matchReference,
    locksAt: prediction.locksAt.toISOString(),
    status: prediction.status,
    totalPool,
    outcomes,
    winningOutcomeId: prediction.winningOutcomeId,
    hiveAuthor: prediction.hiveAuthor,
    hivePermlink: prediction.hivePermlink,
    isVoid: prediction.isVoid,
    voidReason: prediction.voidReason,
    settledAt: prediction.settledAt?.toISOString() ?? null,
    settledBy: prediction.settledBy,
    createdAt: prediction.createdAt.toISOString(),
  };

  if (userStakes) {
    bite.userStakes = userStakes;
  }

  const platformCut = decimalToNumber(prediction.platformCut);
  if (platformCut > 0) {
    bite.settlement = {
      platformCut,
      burnedAmount: decimalToNumber(prediction.burnedAmount),
      rewardPoolAmount: decimalToNumber(prediction.rewardPoolAmount),
    };
  }

  return bite;
}
