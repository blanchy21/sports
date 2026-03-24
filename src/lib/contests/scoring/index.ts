/**
 * Contest Scoring Dispatcher
 *
 * Routes to the correct scoring engine based on contest type.
 */

import { CONTEST_TYPES } from '../constants';
import type { MatchResult, WorldCupPick, GolfFantasyPick } from '../types';
import { calculateWorldCupScore } from './world-cup';
import { calculateGolfScore, type GolferScoreInfo } from './golf';

/**
 * Calculate score for a contest entry based on contest type.
 * For golf, pass golferScores map instead of matches.
 */
export function calculateContestScore(
  contestType: string,
  entryData: unknown,
  matches: MatchResult[],
  golferScores?: Map<string, GolferScoreInfo>
): number {
  switch (contestType) {
    case CONTEST_TYPES.WORLD_CUP_FANTASY: {
      const data = entryData as { picks: WorldCupPick[] };
      return calculateWorldCupScore(data.picks, matches);
    }
    case CONTEST_TYPES.GOLF_FANTASY: {
      const data = entryData as { picks: GolfFantasyPick[] };
      return calculateGolfScore(data.picks, golferScores ?? new Map());
    }
    default:
      throw new Error(`Unknown contest type: ${contestType}`);
  }
}

export { calculateWorldCupScore, calculateGolfScore };
