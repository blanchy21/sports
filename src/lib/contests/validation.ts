/**
 * Contest Entry Validation
 */

import { WORLD_CUP_CONFIG, GOLF_FANTASY_CONFIG } from './constants';
import type { WorldCupEntryData, WorldCupPick, GolfFantasyEntryData, GolfFantasyPick } from './types';

interface ValidationResult<T> {
  valid: boolean;
  parsed?: T;
  error?: string;
}

/**
 * Validate a World Cup Fantasy entry submission.
 * Checks: 16 picks, 4 per pot, valid team codes, unique multipliers 1-16, valid tieBreaker.
 */
export function validateWorldCupEntry(
  data: unknown,
  validTeamCodes: Set<string>,
  teamPotMap: Map<string, number>
): ValidationResult<WorldCupEntryData> {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Entry data is required' };
  }

  const entry = data as Record<string, unknown>;

  // Validate picks array
  if (!Array.isArray(entry.picks)) {
    return { valid: false, error: 'Picks must be an array' };
  }

  if (entry.picks.length !== WORLD_CUP_CONFIG.TOTAL_PICKS) {
    return {
      valid: false,
      error: `Must select exactly ${WORLD_CUP_CONFIG.TOTAL_PICKS} teams`,
    };
  }

  // Validate each pick
  const usedMultipliers = new Set<number>();
  const usedTeams = new Set<string>();
  const potCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const pick of entry.picks) {
    if (!pick || typeof pick !== 'object') {
      return { valid: false, error: 'Invalid pick format' };
    }

    const p = pick as Record<string, unknown>;

    // Validate teamCode
    if (typeof p.teamCode !== 'string' || !validTeamCodes.has(p.teamCode)) {
      return { valid: false, error: `Invalid team code: ${p.teamCode}` };
    }

    if (usedTeams.has(p.teamCode)) {
      return { valid: false, error: `Duplicate team: ${p.teamCode}` };
    }
    usedTeams.add(p.teamCode);

    // Validate pot
    const expectedPot = teamPotMap.get(p.teamCode);
    if (typeof p.pot !== 'number' || p.pot !== expectedPot) {
      return { valid: false, error: `Wrong pot for ${p.teamCode}` };
    }
    potCounts[p.pot] = (potCounts[p.pot] || 0) + 1;

    // Validate multiplier
    if (
      typeof p.multiplier !== 'number' ||
      !Number.isInteger(p.multiplier) ||
      p.multiplier < WORLD_CUP_CONFIG.MULTIPLIER_MIN ||
      p.multiplier > WORLD_CUP_CONFIG.MULTIPLIER_MAX
    ) {
      return {
        valid: false,
        error: `Multiplier must be an integer between ${WORLD_CUP_CONFIG.MULTIPLIER_MIN} and ${WORLD_CUP_CONFIG.MULTIPLIER_MAX}`,
      };
    }

    if (usedMultipliers.has(p.multiplier)) {
      return { valid: false, error: `Duplicate multiplier: ${p.multiplier}` };
    }
    usedMultipliers.add(p.multiplier);
  }

  // Validate pot distribution (4 per pot)
  for (let pot = 1; pot <= WORLD_CUP_CONFIG.POTS_COUNT; pot++) {
    if (potCounts[pot] !== WORLD_CUP_CONFIG.PICKS_PER_POT) {
      return {
        valid: false,
        error: `Must select exactly ${WORLD_CUP_CONFIG.PICKS_PER_POT} teams from Pot ${pot} (got ${potCounts[pot] || 0})`,
      };
    }
  }

  // Validate tieBreaker
  if (
    typeof entry.tieBreaker !== 'number' ||
    !Number.isInteger(entry.tieBreaker) ||
    entry.tieBreaker < WORLD_CUP_CONFIG.TIE_BREAKER_MIN ||
    entry.tieBreaker > WORLD_CUP_CONFIG.TIE_BREAKER_MAX
  ) {
    return {
      valid: false,
      error: `Tie-breaker must be an integer between ${WORLD_CUP_CONFIG.TIE_BREAKER_MIN} and ${WORLD_CUP_CONFIG.TIE_BREAKER_MAX}`,
    };
  }

  const picks: WorldCupPick[] = (entry.picks as Array<Record<string, unknown>>).map((p) => ({
    teamCode: p.teamCode as string,
    pot: p.pot as number,
    multiplier: p.multiplier as number,
  }));

  return {
    valid: true,
    parsed: {
      picks,
      tieBreaker: entry.tieBreaker as number,
    },
  };
}

/**
 * Validate a Golf Fantasy entry submission.
 * Checks: exactly 3 picks, valid golfer codes, no duplicates,
 * combined fractional odds >= 90, tieBreaker integer in [-30, 10].
 */
export function validateGolfFantasyEntry(
  data: unknown,
  validCodes: Set<string>,
  oddsMap: Map<string, number>
): ValidationResult<GolfFantasyEntryData> {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Entry data is required' };
  }

  const entry = data as Record<string, unknown>;

  if (!Array.isArray(entry.picks)) {
    return { valid: false, error: 'Picks must be an array' };
  }

  if (entry.picks.length !== GOLF_FANTASY_CONFIG.PICKS_COUNT) {
    return {
      valid: false,
      error: `Must select exactly ${GOLF_FANTASY_CONFIG.PICKS_COUNT} golfers`,
    };
  }

  const usedCodes = new Set<string>();
  const picks: GolfFantasyPick[] = [];

  for (const pick of entry.picks) {
    if (!pick || typeof pick !== 'object') {
      return { valid: false, error: 'Invalid pick format' };
    }

    const p = pick as Record<string, unknown>;

    if (typeof p.golferCode !== 'string' || !validCodes.has(p.golferCode)) {
      return { valid: false, error: `Invalid golfer code: ${p.golferCode}` };
    }

    if (usedCodes.has(p.golferCode)) {
      return { valid: false, error: `Duplicate golfer: ${p.golferCode}` };
    }
    usedCodes.add(p.golferCode);

    const odds = oddsMap.get(p.golferCode);
    if (odds === undefined) {
      return { valid: false, error: `No odds found for golfer: ${p.golferCode}` };
    }

    picks.push({ golferCode: p.golferCode, odds });
  }

  // Combined fractional odds must be >= 90
  const combinedOdds = picks.reduce((sum, p) => sum + p.odds, 0);
  if (combinedOdds < GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS) {
    return {
      valid: false,
      error: `Combined odds must be at least ${GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS}/1 (currently ${combinedOdds}/1)`,
    };
  }

  // Validate tieBreaker
  if (
    typeof entry.tieBreaker !== 'number' ||
    !Number.isInteger(entry.tieBreaker) ||
    entry.tieBreaker < GOLF_FANTASY_CONFIG.TIE_BREAKER_MIN ||
    entry.tieBreaker > GOLF_FANTASY_CONFIG.TIE_BREAKER_MAX
  ) {
    return {
      valid: false,
      error: `Tie-breaker must be an integer between ${GOLF_FANTASY_CONFIG.TIE_BREAKER_MIN} and ${GOLF_FANTASY_CONFIG.TIE_BREAKER_MAX}`,
    };
  }

  return {
    valid: true,
    parsed: {
      picks,
      tieBreaker: entry.tieBreaker as number,
    },
  };
}
