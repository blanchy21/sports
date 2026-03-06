/**
 * Contest Scoring Dispatcher
 *
 * Routes to the correct scoring engine based on contest type.
 */

import { CONTEST_TYPES } from '../constants';
import type { MatchResult, WorldCupPick } from '../types';
import { calculateWorldCupScore } from './world-cup';

/**
 * Calculate score for a contest entry based on contest type.
 */
export function calculateContestScore(
  contestType: string,
  entryData: unknown,
  matches: MatchResult[]
): number {
  switch (contestType) {
    case CONTEST_TYPES.WORLD_CUP_FANTASY: {
      const data = entryData as { picks: WorldCupPick[] };
      return calculateWorldCupScore(data.picks, matches);
    }
    default:
      throw new Error(`Unknown contest type: ${contestType}`);
  }
}

export { calculateWorldCupScore };
