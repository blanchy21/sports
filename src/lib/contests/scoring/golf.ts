/**
 * Golf Fantasy Scoring Engine
 *
 * User score = sum of their 3 golfers' scores relative to par.
 * Lower is better (like real golf). Cut/WD/DQ golfers receive a penalty
 * for each round they missed.
 */

import type { GolfFantasyPick } from '../types';

/** Penalty added per missed round for cut/WD/DQ golfers */
export const CUT_PENALTY_PER_ROUND = 5;

/** Total rounds in a standard tournament */
const TOTAL_ROUNDS = 4;

export interface GolferScoreInfo {
  scoreRelToPar: number;
  status: string; // 'active' | 'cut' | 'wd' | 'dq'
  roundsPlayed: number;
}

/**
 * Calculate a user's golf fantasy score from their picks.
 *
 * @param picks - The user's 3 golfer picks (from entryData)
 * @param golferScores - Map of golfer code → score info (from ContestTeam metadata)
 * @returns Combined score (lower = better). Returns 0 if no scores available yet.
 */
export function calculateGolfScore(
  picks: GolfFantasyPick[],
  golferScores: Map<string, GolferScoreInfo>
): number {
  let total = 0;
  let hasAnyScore = false;

  for (const pick of picks) {
    const info = golferScores.get(pick.golferCode);
    if (!info) continue; // No score data yet for this golfer

    hasAnyScore = true;
    total += info.scoreRelToPar;

    // Add penalty for missed rounds (cut/WD/DQ)
    if (info.status !== 'active' && info.roundsPlayed < TOTAL_ROUNDS) {
      const missedRounds = TOTAL_ROUNDS - info.roundsPlayed;
      total += missedRounds * CUT_PENALTY_PER_ROUND;
    }
  }

  // If no scores are available yet, return 0
  return hasAnyScore ? total : 0;
}

/**
 * Resolve tiebreaker: closest predicted winning score wins.
 * Returns negative number if entry A wins, positive if entry B wins, 0 if still tied.
 */
export function golfTiebreaker(
  tieBreakerA: number,
  tieBreakerB: number,
  actualWinningScore: number
): number {
  const diffA = Math.abs(tieBreakerA - actualWinningScore);
  const diffB = Math.abs(tieBreakerB - actualWinningScore);
  return diffA - diffB; // negative means A is closer (wins)
}
