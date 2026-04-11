/**
 * World Cup 2026 Teams — Official Draw (December 5, 2025)
 *
 * 48 teams in 4 pots of 12, drawn into 12 groups (A–L) of 4.
 * Hosts (USA, Mexico, Canada) seeded in Pot 1.
 */

export interface WorldCupTeamSeed {
  name: string;
  code: string;
  pot: number;
  group: string;
}

export const WORLD_CUP_2026_TEAMS: WorldCupTeamSeed[] = [
  // ── Pot 1 — Hosts + top-ranked seeds ──────────────────────────
  { name: 'Mexico', code: 'MEX', pot: 1, group: 'A' },
  { name: 'Canada', code: 'CAN', pot: 1, group: 'B' },
  { name: 'Brazil', code: 'BRA', pot: 1, group: 'C' },
  { name: 'United States', code: 'USA', pot: 1, group: 'D' },
  { name: 'Germany', code: 'GER', pot: 1, group: 'E' },
  { name: 'Netherlands', code: 'NED', pot: 1, group: 'F' },
  { name: 'Belgium', code: 'BEL', pot: 1, group: 'G' },
  { name: 'Spain', code: 'ESP', pot: 1, group: 'H' },
  { name: 'France', code: 'FRA', pot: 1, group: 'I' },
  { name: 'Argentina', code: 'ARG', pot: 1, group: 'J' },
  { name: 'Portugal', code: 'POR', pot: 1, group: 'K' },
  { name: 'England', code: 'ENG', pot: 1, group: 'L' },

  // ── Pot 2 — Strong contenders ─────────────────────────────────
  { name: 'South Korea', code: 'KOR', pot: 2, group: 'A' },
  { name: 'Switzerland', code: 'SUI', pot: 2, group: 'B' },
  { name: 'Morocco', code: 'MAR', pot: 2, group: 'C' },
  { name: 'Australia', code: 'AUS', pot: 2, group: 'D' },
  { name: 'Ecuador', code: 'ECU', pot: 2, group: 'E' },
  { name: 'Japan', code: 'JPN', pot: 2, group: 'F' },
  { name: 'Iran', code: 'IRN', pot: 2, group: 'G' },
  { name: 'Uruguay', code: 'URU', pot: 2, group: 'H' },
  { name: 'Senegal', code: 'SEN', pot: 2, group: 'I' },
  { name: 'Austria', code: 'AUT', pot: 2, group: 'J' },
  { name: 'Colombia', code: 'COL', pot: 2, group: 'K' },
  { name: 'Croatia', code: 'CRO', pot: 2, group: 'L' },

  // ── Pot 3 — Mid-ranked qualifiers ─────────────────────────────
  { name: 'South Africa', code: 'RSA', pot: 3, group: 'A' },
  { name: 'Qatar', code: 'QAT', pot: 3, group: 'B' },
  { name: 'Scotland', code: 'SCO', pot: 3, group: 'C' },
  { name: 'Paraguay', code: 'PAR', pot: 3, group: 'D' },
  { name: 'Ivory Coast', code: 'CIV', pot: 3, group: 'E' },
  { name: 'Tunisia', code: 'TUN', pot: 3, group: 'F' },
  { name: 'Egypt', code: 'EGY', pot: 3, group: 'G' },
  { name: 'Saudi Arabia', code: 'KSA', pot: 3, group: 'H' },
  { name: 'Norway', code: 'NOR', pot: 3, group: 'I' },
  { name: 'Algeria', code: 'ALG', pot: 3, group: 'J' },
  { name: 'Uzbekistan', code: 'UZB', pot: 3, group: 'K' },
  { name: 'Panama', code: 'PAN', pot: 3, group: 'L' },

  // ── Pot 4 — Lower-ranked qualifiers ───────────────────────────
  { name: 'Czechia', code: 'CZE', pot: 4, group: 'A' },
  { name: 'Bosnia & Herzegovina', code: 'BIH', pot: 4, group: 'B' },
  { name: 'Haiti', code: 'HAI', pot: 4, group: 'C' },
  { name: 'Turkey', code: 'TUR', pot: 4, group: 'D' },
  { name: 'Curacao', code: 'CUR', pot: 4, group: 'E' },
  { name: 'Sweden', code: 'SWE', pot: 4, group: 'F' },
  { name: 'New Zealand', code: 'NZL', pot: 4, group: 'G' },
  { name: 'Cape Verde', code: 'CPV', pot: 4, group: 'H' },
  { name: 'Iraq', code: 'IRQ', pot: 4, group: 'I' },
  { name: 'Jordan', code: 'JOR', pot: 4, group: 'J' },
  { name: 'DR Congo', code: 'COD', pot: 4, group: 'K' },
  { name: 'Ghana', code: 'GHA', pot: 4, group: 'L' },
];

/** Helper: get all teams in a specific group */
export function getTeamsByGroup(group: string): WorldCupTeamSeed[] {
  return WORLD_CUP_2026_TEAMS.filter((t) => t.group === group);
}

/** Helper: get all teams in a specific pot */
export function getTeamsByPot(pot: number): WorldCupTeamSeed[] {
  return WORLD_CUP_2026_TEAMS.filter((t) => t.pot === pot);
}

/** All 12 group letters */
export const WORLD_CUP_GROUPS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
] as const;

export type WorldCupGroup = (typeof WORLD_CUP_GROUPS)[number];
