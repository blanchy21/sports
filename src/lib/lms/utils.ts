import { PL_TEAMS_2526, type PLTeam } from './teams';
import type { LmsFixture, LmsPickResult } from './types';

/**
 * Get teams the player hasn't used yet.
 */
export function getAvailableTeams(usedTeams: string[]): PLTeam[] {
  const used = new Set(usedTeams);
  return PL_TEAMS_2526.filter((t) => !used.has(t));
}

/**
 * Get the auto-pick team: first available alphabetically.
 */
export function getAutoPickTeam(usedTeams: string[]): PLTeam | null {
  const available = getAvailableTeams(usedTeams);
  return available.length > 0 ? available[0] : null;
}

/**
 * Resolve a pick result based on fixture outcome.
 * Returns the result for the picked team.
 */
export function resolvePickResult(teamPicked: string, fixtures: LmsFixture[]): LmsPickResult {
  const fixture = fixtures.find((f) => f.homeTeam === teamPicked || f.awayTeam === teamPicked);

  if (!fixture) return 'pending';
  if (fixture.postponed) return 'postponed';
  if (fixture.homeGoals === null || fixture.awayGoals === null) return 'pending';

  const isHome = fixture.homeTeam === teamPicked;
  const teamGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
  const opponentGoals = isHome ? fixture.awayGoals : fixture.homeGoals;

  if (teamGoals > opponentGoals) return 'survived';
  return 'eliminated'; // draw or loss
}

/**
 * Find the opponent and kickoff time for a given team in a fixture list.
 */
export function getFixtureForTeam(
  team: string,
  fixtures: LmsFixture[]
): { opponent: string; kickoff: string; isHome: boolean } | null {
  const fixture = fixtures.find((f) => f.homeTeam === team || f.awayTeam === team);
  if (!fixture) return null;

  const isHome = fixture.homeTeam === team;
  return {
    opponent: isHome ? fixture.awayTeam : fixture.homeTeam,
    kickoff: fixture.kickoff,
    isHome,
  };
}

/**
 * Recalculate usedTeams from resolved picks + current pick.
 * This avoids the push-blindly problem when changing picks.
 */
export function recalculateUsedTeams(
  resolvedPicks: { teamPicked: string; result: string }[],
  currentPick: string | null
): string[] {
  const teams: string[] = [];

  for (const pick of resolvedPicks) {
    // Postponed picks return the team to the pool
    if (pick.result !== 'postponed') {
      teams.push(pick.teamPicked);
    }
  }

  if (currentPick) {
    teams.push(currentPick);
  }

  return [...new Set(teams)];
}
