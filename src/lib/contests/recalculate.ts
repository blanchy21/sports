/**
 * Leaderboard Recalculation
 *
 * Recalculates all entry scores for a contest based on current match results.
 * Called after every match result entry.
 */

import { prisma } from '@/lib/db/prisma';
import { calculateContestScore } from './scoring';
import { logger } from '@/lib/logger';
import type { MatchResult } from './types';
import { Prisma } from '@/generated/prisma/client';

/**
 * Recalculate all entry scores and ranks for a contest.
 * Runs in a single Prisma transaction for consistency.
 */
export async function recalculateLeaderboard(contestId: string): Promise<{ entriesUpdated: number }> {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) throw new Error(`Contest not found: ${contestId}`);

  // Fetch all match results
  const matches = await prisma.contestMatch.findMany({
    where: {
      contestId,
      homeScore: { not: null },
      awayScore: { not: null },
    },
  });

  const matchResults: MatchResult[] = matches.map((m) => ({
    matchNumber: m.matchNumber,
    round: m.round,
    homeTeamCode: m.homeTeamCode,
    awayTeamCode: m.awayTeamCode,
    homeScore: m.homeScore!,
    awayScore: m.awayScore!,
  }));

  // Fetch all entries
  const entries = await prisma.contestEntry.findMany({
    where: { contestId },
  });

  if (entries.length === 0) return { entriesUpdated: 0 };

  // Calculate scores and assign ranks
  const scored: Array<{ id: string; totalScore: number; rank: number }> = entries
    .map((entry) => {
      const score = calculateContestScore(contest.contestType, entry.entryData, matchResults);
      return { id: entry.id, totalScore: score, rank: 1 };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks (ties get same rank)
  let currentRank = 1;
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].totalScore < scored[i - 1].totalScore) {
      currentRank = i + 1;
    }
    scored[i].rank = currentRank;
  }

  // Batch update in transaction (chunks of 50 to avoid huge transactions)
  const CHUNK_SIZE = 50;
  for (let i = 0; i < scored.length; i += CHUNK_SIZE) {
    const chunk = scored.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map((s) =>
        prisma.contestEntry.update({
          where: { id: s.id },
          data: {
            totalScore: new Prisma.Decimal(s.totalScore),
            rank: s.rank,
          },
        })
      )
    );
  }

  logger.info(
    `Leaderboard recalculated: ${entries.length} entries, ${matchResults.length} matches`,
    'contests',
    { contestId, entriesUpdated: entries.length }
  );

  return { entriesUpdated: entries.length };
}
