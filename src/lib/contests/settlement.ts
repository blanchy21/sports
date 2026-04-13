/**
 * Contest Settlement
 *
 * Calculates prize distribution and builds payout operations.
 * Follows the same idempotent, retry-safe pattern as predictions/settlement.ts.
 */

import { prisma } from '@/lib/db/prisma';
import { CONTEST_CONFIG, CONTEST_TYPES, PRIZE_MODELS } from './constants';
import { Prisma } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';

export interface SettlementResult {
  prizeModel: string;
  platformFee: Prisma.Decimal;
  creatorFee: Prisma.Decimal;
  prizePoolNet: Prisma.Decimal;
  /** Total entry fees collected (entryCount × entryFee). Used by FIXED model for burning. */
  entryFeesCollected: Prisma.Decimal;
  placements: Array<{
    placement: number;
    username: string;
    totalScore: number;
    payoutAmount: Prisma.Decimal;
    entryId: string;
  }>;
  tieBreaker?: {
    /** Actual value used for tiebreaker (goals for match contests, winning-score-to-par for golf). */
    actualValue: number | null;
    appliedForPositions: number[];
  };
}

export interface SettlementOptions {
  /** Match-contest tiebreaker: actual total goals in final match. */
  actualTotalGoals?: number;
  /** Golf-contest tiebreaker: winning score relative to par (lower is better). */
  actualWinningScore?: number;
}

/**
 * Calculate the settlement for a contest.
 * Does NOT broadcast — just calculates amounts and updates the database.
 */
export async function calculateSettlement(
  contestId: string,
  options?: SettlementOptions
): Promise<SettlementResult> {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) throw new Error(`Contest not found: ${contestId}`);
  if (contest.status !== 'CALCULATING') {
    throw new Error(`Contest must be in CALCULATING status, got: ${contest.status}`);
  }

  const isFixed = contest.prizeModel === PRIZE_MODELS.FIXED;
  const isGolf = contest.contestType === CONTEST_TYPES.GOLF_FANTASY;
  const entryFeesCollected = new Prisma.Decimal(contest.entryCount).mul(
    new Prisma.Decimal(contest.entryFee)
  );

  let platformFee: Prisma.Decimal;
  let creatorFee: Prisma.Decimal;
  let prizePoolNet: Prisma.Decimal;

  if (isFixed) {
    // FIXED: prizes come from fixedPrizePool, fees are 0
    platformFee = new Prisma.Decimal(0);
    creatorFee = new Prisma.Decimal(0);
    prizePoolNet = new Prisma.Decimal(contest.prizePool);
  } else {
    // FEE_FUNDED: pool = accumulated entry fees, split into fees + prizes
    const totalPool = new Prisma.Decimal(contest.prizePool);
    platformFee = totalPool.mul(new Prisma.Decimal(contest.platformFeePct));
    creatorFee = totalPool.mul(new Prisma.Decimal(contest.creatorFeePct));
    prizePoolNet = totalPool.sub(platformFee).sub(creatorFee);
  }

  // Get top entries ordered by score.
  // Golf: lower is better (ascending). Match contests: higher is better (descending).
  const entries = await prisma.contestEntry.findMany({
    where: { contestId },
    orderBy: [{ totalScore: isGolf ? 'asc' : 'desc' }, { createdAt: 'asc' }],
  });

  if (entries.length === 0) {
    return {
      prizeModel: contest.prizeModel,
      platformFee,
      creatorFee,
      prizePoolNet,
      entryFeesCollected,
      placements: [],
    };
  }

  // Resolve ties for top 3 using tie-breaker (closest prediction to actual value).
  // For golf the actual value is the winning score relative to par; for match
  // contests it's the total goals in the final. Both use "closest to actual" logic.
  const actualValue = isGolf ? options?.actualWinningScore : options?.actualTotalGoals;

  let rankedEntries = entries;
  const tieBreaker: SettlementResult['tieBreaker'] = {
    actualValue: actualValue ?? null,
    appliedForPositions: [],
  };

  if (actualValue !== undefined) {
    rankedEntries = [...entries].sort((a, b) => {
      const scoreDiff = isGolf
        ? Number(a.totalScore) - Number(b.totalScore) // golf: lower wins
        : Number(b.totalScore) - Number(a.totalScore); // match: higher wins
      if (scoreDiff !== 0) return scoreDiff;

      // Tie-breaker: closest tieBreaker prediction to actual
      const aEntry = a.entryData as { tieBreaker?: number };
      const bEntry = b.entryData as { tieBreaker?: number };
      const aDiff = Math.abs((aEntry.tieBreaker ?? 0) - actualValue);
      const bDiff = Math.abs((bEntry.tieBreaker ?? 0) - actualValue);
      if (aDiff !== bDiff) return aDiff - bDiff;

      // Final tiebreaker: earlier entry wins
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  // Calculate prize amounts for top 3
  const splits = [
    CONTEST_CONFIG.PRIZE_SPLIT.FIRST,
    CONTEST_CONFIG.PRIZE_SPLIT.SECOND,
    CONTEST_CONFIG.PRIZE_SPLIT.THIRD,
  ];

  const placements: SettlementResult['placements'] = [];

  const prizeCount = Math.min(3, rankedEntries.length);
  for (let i = 0; i < prizeCount; i++) {
    const entry = rankedEntries[i];
    const payoutAmount = prizePoolNet.mul(new Prisma.Decimal(splits[i]));

    placements.push({
      placement: i + 1,
      username: entry.username,
      totalScore: Number(entry.totalScore),
      payoutAmount,
      entryId: entry.id,
    });
  }

  // If fewer than 3 entries, redistribute remaining prize to top entries
  if (prizeCount < 3 && prizeCount > 0) {
    const usedSplits = splits.slice(0, prizeCount);
    const totalUsed = usedSplits.reduce((a, b) => a + b, 0);
    const scaleFactor = new Prisma.Decimal(1).div(new Prisma.Decimal(totalUsed));

    for (const p of placements) {
      p.payoutAmount = p.payoutAmount.mul(scaleFactor);
    }
  }

  // Update entries with payout amounts and final ranks
  for (const p of placements) {
    await prisma.contestEntry.update({
      where: { id: p.entryId },
      data: {
        payoutAmount: p.payoutAmount,
        rank: p.placement,
      },
    });
  }

  logger.info('Settlement calculated', 'contests', {
    contestId,
    prizeModel: contest.prizeModel,
    prizePoolNet: prizePoolNet.toString(),
    platformFee: platformFee.toString(),
    creatorFee: creatorFee.toString(),
    entryFeesCollected: entryFeesCollected.toString(),
    placements: placements.map((p) => ({
      place: p.placement,
      username: p.username,
      amount: p.payoutAmount.toString(),
    })),
  });

  return {
    prizeModel: contest.prizeModel,
    platformFee,
    creatorFee,
    prizePoolNet,
    entryFeesCollected,
    placements,
    tieBreaker,
  };
}
