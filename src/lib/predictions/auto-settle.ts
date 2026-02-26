/**
 * Auto-Settlement for Prediction Bites
 *
 * Resolves prediction outcomes by matching outcome labels against ESPN match
 * results. When a linked ESPN event finishes, determines the winning outcome
 * and triggers settlement automatically.
 */

import { SportsEvent } from '@/types/sports';

type MatchResult = 'home_win' | 'away_win' | 'draw';

/**
 * Determine the match result from ESPN scores.
 * Returns null if the event isn't finished or has no scores.
 */
function getMatchResult(event: SportsEvent): {
  result: MatchResult;
  homeTeam: string;
  awayTeam: string;
} | null {
  if (event.status !== 'finished') return null;
  if (!event.score || !event.teams) return null;

  const homeScore = parseInt(event.score.home, 10);
  const awayScore = parseInt(event.score.away, 10);

  if (isNaN(homeScore) || isNaN(awayScore)) return null;

  let result: MatchResult;
  if (homeScore > awayScore) result = 'home_win';
  else if (awayScore > homeScore) result = 'away_win';
  else result = 'draw';

  return { result, homeTeam: event.teams.home, awayTeam: event.teams.away };
}

/**
 * Check if an outcome label matches the match result.
 *
 * Handles patterns like:
 * - Team name: "Wolves", "Aston Villa"
 * - Team Win: "Wolves Win", "Wolves to Win"
 * - Generic: "Home Win", "Away Win", "Draw", "Tie"
 */
function labelMatchesResult(
  label: string,
  result: MatchResult,
  homeTeam: string,
  awayTeam: string
): boolean {
  const norm = label.toLowerCase().trim();

  // Direct result keywords
  if (result === 'draw') {
    if (norm === 'draw' || norm === 'tie' || norm === 'draws') return true;
  }

  if (result === 'home_win') {
    if (norm === 'home win' || norm === 'home') return true;
  }

  if (result === 'away_win') {
    if (norm === 'away win' || norm === 'away') return true;
  }

  // Team-name matching: check if the label references the winning/drawing team
  const winningTeam = result === 'home_win' ? homeTeam : result === 'away_win' ? awayTeam : null;

  if (winningTeam && teamNameMatches(norm, winningTeam.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Check if a label references a team name.
 * Handles full names ("Wolverhampton Wanderers"), short names ("Wolves"),
 * and patterns like "Wolves Win" or "Wolves to Win".
 */
function teamNameMatches(normLabel: string, normTeam: string): boolean {
  // Strip common suffixes from label: "win", "to win", "wins"
  const stripped = normLabel.replace(/\s+(to\s+)?wins?$/i, '').trim();

  // Check if label (or stripped label) matches team name or vice versa
  if (stripped === normTeam) return true;
  if (normTeam.includes(stripped) && stripped.length >= 3) return true;
  if (stripped.includes(normTeam) && normTeam.length >= 3) return true;

  // Check individual words in team name (e.g. "Villa" from "Aston Villa")
  const teamWords = normTeam.split(/\s+/);
  if (teamWords.length > 1) {
    for (const word of teamWords) {
      if (word.length >= 4 && stripped === word) return true;
    }
  }

  return false;
}

/**
 * Resolve which outcome won based on ESPN match results.
 *
 * Returns the winning outcome ID, or null if no unambiguous match is found
 * (in which case manual settlement is required).
 */
export function resolveWinningOutcome(
  event: SportsEvent,
  outcomes: { id: string; label: string }[]
): string | null {
  const matchInfo = getMatchResult(event);
  if (!matchInfo) return null;

  const { result, homeTeam, awayTeam } = matchInfo;

  const matched: string[] = [];
  for (const outcome of outcomes) {
    if (labelMatchesResult(outcome.label, result, homeTeam, awayTeam)) {
      matched.push(outcome.id);
    }
  }

  // Exactly one match → unambiguous winner
  if (matched.length === 1) return matched[0];

  // Zero or multiple matches → can't auto-settle
  return null;
}
