/**
 * World Cup Fantasy Scoring Engine
 *
 * Stateless, deterministic scoring function. Given a set of picks and match results,
 * produces the same total score every time. Safe for recalculation.
 */

import { WORLD_CUP_CONFIG } from '../constants';
import type { MatchResult, WorldCupPick } from '../types';

/** Ordered knockout rounds for progression tracking */
const KNOCKOUT_ROUND_ORDER = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
] as const;

/**
 * Determine the highest knockout round each team reached based on match results.
 * A team "reached" a round if they have a match in that round.
 * Champion = winner of the final. Runner-up = loser of the final.
 */
function buildTeamProgressions(matches: MatchResult[]): Map<string, { highestRound: string; isChampion: boolean; isRunnerUp: boolean }> {
  const progressions = new Map<string, { highestRound: string; isChampion: boolean; isRunnerUp: boolean }>();

  // Initialize all teams that appear in any match
  for (const match of matches) {
    if (!progressions.has(match.homeTeamCode)) {
      progressions.set(match.homeTeamCode, { highestRound: 'group', isChampion: false, isRunnerUp: false });
    }
    if (!progressions.has(match.awayTeamCode)) {
      progressions.set(match.awayTeamCode, { highestRound: 'group', isChampion: false, isRunnerUp: false });
    }
  }

  // Track highest round for each team
  for (const match of matches) {
    const roundIndex = KNOCKOUT_ROUND_ORDER.indexOf(match.round as typeof KNOCKOUT_ROUND_ORDER[number]);
    if (roundIndex === -1) continue; // group stage, skip

    for (const teamCode of [match.homeTeamCode, match.awayTeamCode]) {
      const prog = progressions.get(teamCode);
      if (!prog) continue;

      const currentIndex = KNOCKOUT_ROUND_ORDER.indexOf(prog.highestRound as typeof KNOCKOUT_ROUND_ORDER[number]);
      if (roundIndex > currentIndex) {
        prog.highestRound = match.round;
      }
    }
  }

  // Determine champion and runner-up from the final match
  const finalMatch = matches.find((m) => m.round === 'final');
  if (finalMatch && finalMatch.homeScore !== null && finalMatch.awayScore !== null) {
    const homeWins = finalMatch.homeScore > finalMatch.awayScore;
    const champion = homeWins ? finalMatch.homeTeamCode : finalMatch.awayTeamCode;
    const runnerUp = homeWins ? finalMatch.awayTeamCode : finalMatch.homeTeamCode;

    const champProg = progressions.get(champion);
    if (champProg) champProg.isChampion = true;

    const runnerProg = progressions.get(runnerUp);
    if (runnerProg) runnerProg.isRunnerUp = true;
  }

  return progressions;
}

/**
 * Get the knockout bonus points for reaching a given round.
 * Bonuses are cumulative: a team that reaches the semi-final also gets
 * the round_of_32, round_of_16, and quarter_final bonuses.
 */
function getKnockoutBonusPoints(
  highestRound: string,
  isChampion: boolean,
  isRunnerUp: boolean
): number {
  const bonuses = WORLD_CUP_CONFIG.KNOCKOUT_BONUSES;
  let total = 0;

  const roundIndex = KNOCKOUT_ROUND_ORDER.indexOf(highestRound as typeof KNOCKOUT_ROUND_ORDER[number]);

  // Accumulate bonuses for each round reached
  for (let i = 0; i <= roundIndex && i < KNOCKOUT_ROUND_ORDER.length; i++) {
    const round = KNOCKOUT_ROUND_ORDER[i];
    if (round in bonuses) {
      total += bonuses[round as keyof typeof bonuses];
    }
  }

  // Special bonuses for finalist/champion
  if (isChampion) {
    total += bonuses.champion;
  } else if (isRunnerUp) {
    total += bonuses.runner_up;
  }

  return total;
}

/**
 * Calculate match points for a team in a single match.
 * Regular time only — extra time and penalties don't count.
 */
function calculateMatchPoints(
  teamCode: string,
  match: MatchResult
): number {
  const isHome = match.homeTeamCode === teamCode;
  const isAway = match.awayTeamCode === teamCode;
  if (!isHome && !isAway) return 0;

  const goalsFor = isHome ? match.homeScore : match.awayScore;
  const goalsAgainst = isHome ? match.awayScore : match.homeScore;

  let basePoints = 0;

  // Win/draw/loss
  if (goalsFor > goalsAgainst) {
    basePoints += WORLD_CUP_CONFIG.SCORING.WIN;
  } else if (goalsFor === goalsAgainst) {
    basePoints += WORLD_CUP_CONFIG.SCORING.DRAW;
  }

  // Goals scored
  basePoints += goalsFor * WORLD_CUP_CONFIG.SCORING.GOAL;

  return basePoints;
}

/**
 * Calculate the total score for a single World Cup Fantasy entry.
 *
 * @param picks - The user's 16 team picks with multipliers
 * @param matches - All completed match results (regular time only)
 * @returns Total score
 */
export function calculateWorldCupScore(
  picks: WorldCupPick[],
  matches: MatchResult[]
): number {
  // Only consider matches with results
  const completedMatches = matches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null
  );

  if (completedMatches.length === 0) return 0;

  // Build a lookup for multipliers
  const multiplierMap = new Map<string, number>();
  for (const pick of picks) {
    multiplierMap.set(pick.teamCode, pick.multiplier);
  }

  // Build team progressions for knockout bonuses
  const progressions = buildTeamProgressions(completedMatches);

  let totalScore = 0;

  // 1. Match points: for each completed match, score any picked teams
  for (const match of completedMatches) {
    for (const teamCode of [match.homeTeamCode, match.awayTeamCode]) {
      const multiplier = multiplierMap.get(teamCode);
      if (multiplier === undefined) continue; // Team not in user's picks

      const matchPoints = calculateMatchPoints(teamCode, match);
      totalScore += matchPoints * multiplier;
    }
  }

  // 2. Knockout bonuses: for each picked team, check their progression
  for (const pick of picks) {
    const progression = progressions.get(pick.teamCode);
    if (!progression) continue;

    const bonusPoints = getKnockoutBonusPoints(
      progression.highestRound,
      progression.isChampion,
      progression.isRunnerUp
    );

    totalScore += bonusPoints * pick.multiplier;
  }

  return totalScore;
}
