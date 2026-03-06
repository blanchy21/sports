/**
 * World Cup 2026 Teams — Seed Data
 *
 * 48 teams in 4 pots based on FIFA rankings and host status.
 * Pot assignments based on expected seedings (official draw TBD).
 */

export interface WorldCupTeamSeed {
  name: string;
  code: string;
  pot: number;
}

/**
 * 2026 World Cup teams divided into 4 pots of 12.
 * Pots based on FIFA rankings (subject to official draw).
 * Hosts (USA, Mexico, Canada) are in Pot 1.
 */
export const WORLD_CUP_2026_TEAMS: WorldCupTeamSeed[] = [
  // Pot 1 — Hosts + top-ranked teams
  { name: 'United States', code: 'USA', pot: 1 },
  { name: 'Mexico', code: 'MEX', pot: 1 },
  { name: 'Canada', code: 'CAN', pot: 1 },
  { name: 'Argentina', code: 'ARG', pot: 1 },
  { name: 'France', code: 'FRA', pot: 1 },
  { name: 'Spain', code: 'ESP', pot: 1 },
  { name: 'England', code: 'ENG', pot: 1 },
  { name: 'Brazil', code: 'BRA', pot: 1 },
  { name: 'Belgium', code: 'BEL', pot: 1 },
  { name: 'Netherlands', code: 'NED', pot: 1 },
  { name: 'Portugal', code: 'POR', pot: 1 },
  { name: 'Germany', code: 'GER', pot: 1 },

  // Pot 2 — Strong contenders
  { name: 'Italy', code: 'ITA', pot: 2 },
  { name: 'Croatia', code: 'CRO', pot: 2 },
  { name: 'Colombia', code: 'COL', pot: 2 },
  { name: 'Uruguay', code: 'URU', pot: 2 },
  { name: 'Japan', code: 'JPN', pot: 2 },
  { name: 'Morocco', code: 'MAR', pot: 2 },
  { name: 'Senegal', code: 'SEN', pot: 2 },
  { name: 'Iran', code: 'IRN', pot: 2 },
  { name: 'Denmark', code: 'DEN', pot: 2 },
  { name: 'Switzerland', code: 'SUI', pot: 2 },
  { name: 'Austria', code: 'AUT', pot: 2 },
  { name: 'Australia', code: 'AUS', pot: 2 },

  // Pot 3 — Mid-ranked teams
  { name: 'Ecuador', code: 'ECU', pot: 3 },
  { name: 'Wales', code: 'WAL', pot: 3 },
  { name: 'South Korea', code: 'KOR', pot: 3 },
  { name: 'Ukraine', code: 'UKR', pot: 3 },
  { name: 'Turkey', code: 'TUR', pot: 3 },
  { name: 'Serbia', code: 'SRB', pot: 3 },
  { name: 'Paraguay', code: 'PAR', pot: 3 },
  { name: 'Egypt', code: 'EGY', pot: 3 },
  { name: 'Saudi Arabia', code: 'KSA', pot: 3 },
  { name: 'Qatar', code: 'QAT', pot: 3 },
  { name: 'Cameroon', code: 'CMR', pot: 3 },
  { name: 'Nigeria', code: 'NGA', pot: 3 },

  // Pot 4 — Lower-ranked qualifiers
  { name: 'Panama', code: 'PAN', pot: 4 },
  { name: 'Costa Rica', code: 'CRC', pot: 4 },
  { name: 'Jamaica', code: 'JAM', pot: 4 },
  { name: 'Honduras', code: 'HON', pot: 4 },
  { name: 'Bolivia', code: 'BOL', pot: 4 },
  { name: 'Peru', code: 'PER', pot: 4 },
  { name: 'Chile', code: 'CHI', pot: 4 },
  { name: 'Venezuela', code: 'VEN', pot: 4 },
  { name: 'Ghana', code: 'GHA', pot: 4 },
  { name: 'Tunisia', code: 'TUN', pot: 4 },
  { name: 'New Zealand', code: 'NZL', pot: 4 },
  { name: 'Indonesia', code: 'IDN', pot: 4 },
];
