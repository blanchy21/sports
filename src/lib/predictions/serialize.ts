import type { Prediction, PredictionOutcome, PredictionStake } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type {
  PredictionBite,
  PredictionOutcomeResponse,
  UserStakeInfo,
  OutcomeStaker,
} from './types';
import { calculateOdds } from './odds';

export function decimalToNumber(d: Prisma.Decimal | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return d.toNumber();
}

export function serializePrediction(
  prediction: Prediction & {
    outcomes: PredictionOutcome[];
    stakes?: PredictionStake[];
    _count?: { stakes: number };
  },
  currentUsername?: string,
  options?: { includeStakers?: boolean }
): PredictionBite {
  const includeStakers = options?.includeStakers ?? true;
  const totalPool = decimalToNumber(prediction.totalPool);

  const outcomes: PredictionOutcomeResponse[] = prediction.outcomes.map((outcome) => {
    const outcomeStaked = decimalToNumber(outcome.totalStaked);
    const odds = calculateOdds(totalPool, outcomeStaked);

    // Aggregate stakers per outcome (combine multiple stakes by same user)
    let stakers: OutcomeStaker[] | undefined;
    if (includeStakers && prediction.stakes) {
      const outcomeStakes = prediction.stakes.filter((s) => s.outcomeId === outcome.id);
      const byUser = new Map<string, { amount: number; payout: number }>();
      for (const s of outcomeStakes) {
        const prev = byUser.get(s.username) ?? { amount: 0, payout: 0 };
        prev.amount += decimalToNumber(s.amount);
        if (s.payout) prev.payout += decimalToNumber(s.payout);
        byUser.set(s.username, prev);
      }
      stakers = [...byUser.entries()]
        .map(([username, { amount, payout }]) => ({
          username,
          amount,
          ...(payout > 0 ? { payout } : {}),
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    }

    return {
      id: outcome.id,
      label: outcome.label,
      totalStaked: outcomeStaked,
      backerCount: outcome.backerCount,
      isWinner: outcome.isWinner,
      odds: odds.multiplier,
      percentage: odds.percentage,
      stakers,
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
        refunded: s.refundTxId != null,
      }));
    }
  }

  // canModify: creator can edit/delete only while OPEN and no other users have staked
  const isCreator = !!currentUsername && currentUsername === prediction.creatorUsername;
  // When we have all stakes: check directly. When we only have partial (user-filtered)
  // stakes + _count: compare total count vs user's stake count.
  const hasNonCreatorStakes = prediction._count
    ? prediction._count.stakes > (prediction.stakes?.length ?? 0)
    : (prediction.stakes?.some((s) => s.username !== prediction.creatorUsername) ?? false);
  const canModify = isCreator && prediction.status === 'OPEN' && !hasNonCreatorStakes;

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
    canModify,
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
