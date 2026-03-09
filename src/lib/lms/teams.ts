/**
 * Premier League 2025/26 Teams — canonical list for LMS
 * Alphabetically sorted for auto-pick ordering.
 */
export const PL_TEAMS_2526 = [
  'Arsenal',
  'Aston Villa',
  'Bournemouth',
  'Brentford',
  'Brighton',
  'Burnley',
  'Chelsea',
  'Crystal Palace',
  'Everton',
  'Fulham',
  'Leeds United',
  'Liverpool',
  'Man City',
  'Man United',
  'Newcastle',
  'Nottm Forest',
  'Sunderland',
  'Tottenham',
  'West Ham',
  'Wolves',
] as const;

export type PLTeam = (typeof PL_TEAMS_2526)[number];
