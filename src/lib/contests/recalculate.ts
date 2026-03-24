/**
 * Leaderboard Recalculation
 *
 * Recalculates all entry scores for a contest based on current results.
 * Handles both match-based (World Cup) and golfer-metadata-based (Golf) scoring.
 */

import { prisma } from '@/lib/db/prisma';
import { calculateContestScore } from './scoring';
import { logger } from '@/lib/logger';
import { CONTEST_TYPES } from './constants';
import type { MatchResult, GolfFantasyEntryData } from './types';
import type { GolferScoreInfo } from './scoring/golf';
import { getGolfScoringState, type GolferTeamMetadata } from './espn-golf';
import { Prisma } from '@/generated/prisma/client';

/**
 * Recalculate all entry scores and ranks for a contest.
 * Runs in a single Prisma transaction for consistency.
 */
export async function recalculateLeaderboard(
  contestId: string
): Promise<{ entriesUpdated: number }> {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) throw new Error(`Contest not found: ${contestId}`);

  const isGolf = contest.contestType === CONTEST_TYPES.GOLF_FANTASY;

  // Build scoring context based on contest type
  let matchResults: MatchResult[] = [];
  let golferScores: Map<string, GolferScoreInfo> | undefined;
  let winningScore: number | null = null;

  if (isGolf) {
    // Golf: load golfer scores from ContestTeam metadata
    const teams = await prisma.contestTeam.findMany({
      where: { contestId },
      select: { code: true, metadata: true },
    });

    golferScores = new Map();
    for (const team of teams) {
      const meta = team.metadata as GolferTeamMetadata | null;
      if (meta?.scoreRelToPar !== undefined) {
        const roundsPlayed = meta.rounds ? Object.keys(meta.rounds).length : 0;
        golferScores.set(team.code, {
          scoreRelToPar: meta.scoreRelToPar,
          status: meta.status || 'active',
          roundsPlayed,
        });
      }
    }

    // Get winning score for tiebreaker
    const scoringState = getGolfScoringState(contest.typeConfig);
    winningScore = scoringState.winningScore;
  } else {
    // Match-based: fetch match results
    const matches = await prisma.contestMatch.findMany({
      where: { contestId, homeScore: { not: null }, awayScore: { not: null } },
    });

    matchResults = matches.map((m) => ({
      matchNumber: m.matchNumber,
      round: m.round,
      homeTeamCode: m.homeTeamCode,
      awayTeamCode: m.awayTeamCode,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
    }));
  }

  // Fetch all entries
  const entries = await prisma.contestEntry.findMany({ where: { contestId } });
  if (entries.length === 0) return { entriesUpdated: 0 };

  // Calculate scores
  const scored: Array<{ id: string; totalScore: number; tieBreaker: number; rank: number }> =
    entries.map((entry) => {
      const score = calculateContestScore(
        contest.contestType,
        entry.entryData,
        matchResults,
        golferScores
      );
      const entryData = entry.entryData as { tieBreaker?: number } | null;
      return { id: entry.id, totalScore: score, tieBreaker: entryData?.tieBreaker ?? 0, rank: 1 };
    });

  // Sort: golf = ascending (lower is better), others = descending (higher is better)
  if (isGolf) {
    scored.sort((a, b) => {
      if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
      // Tiebreaker: closest to actual winning score
      if (winningScore !== null) {
        const diffA = Math.abs(a.tieBreaker - winningScore);
        const diffB = Math.abs(b.tieBreaker - winningScore);
        return diffA - diffB;
      }
      return 0;
    });
  } else {
    scored.sort((a, b) => b.totalScore - a.totalScore);
  }

  // Assign ranks (ties get same rank)
  let currentRank = 1;
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].totalScore !== scored[i - 1].totalScore) {
      currentRank = i + 1;
    }
    scored[i].rank = currentRank;
  }

  // Batch update in transaction (chunks of 50)
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
    `Leaderboard recalculated: ${entries.length} entries${isGolf ? ' (golf)' : `, ${matchResults.length} matches`}`,
    'contests',
    { contestId, entriesUpdated: entries.length }
  );

  return { entriesUpdated: entries.length };
}
