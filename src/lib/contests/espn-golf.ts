/**
 * ESPN Golf API Client
 *
 * Fetches live tournament scoring data from ESPN's public scoreboard endpoint
 * and matches golfer names to our ContestTeam records.
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface EspnGolferData {
  espnName: string;
  espnId: string;
  order: number; // tournament position (1 = leader)
  scoreRelToPar: number; // e.g. -11
  scoreDisplay: string; // e.g. "-11" or "E"
  rounds: Record<number, { display: string; strokes: number }>;
  status: 'active' | 'cut' | 'wd' | 'dq';
  thru: number; // holes completed in current round (18 = finished)
  currentRound: number;
}

export interface GolfScoringState {
  draftScores: EspnGolferData[] | null;
  draftFetchedAt: string | null;
  publishedRound: number;
  winningScore: number | null;
  nameOverrides: Record<string, string>; // ESPN name → DB code
  unmatchedNames: string[];
}

export interface GolferTeamMetadata {
  odds: number;
  rounds?: Record<string, string>; // "1" → "-3"
  strokes?: Record<string, number>; // "1" → 69
  scoreRelToPar?: number;
  position?: number;
  status?: string;
}

export const DEFAULT_GOLF_SCORING_STATE: GolfScoringState = {
  draftScores: null,
  draftFetchedAt: null,
  publishedRound: 0,
  winningScore: null,
  nameOverrides: {},
  unmatchedNames: [],
};

// ============================================================================
// ESPN API
// ============================================================================

const ESPN_GOLF_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

interface EspnLinescore {
  period: number;
  value: number;
  displayValue: string;
}

interface EspnCompetitor {
  id: string;
  order: number;
  score: string;
  status?: { period?: number; type?: { name?: string } } | null;
  athlete: {
    displayName: string;
    fullName?: string;
  };
  linescores?: EspnLinescore[];
}

interface EspnEvent {
  id: string;
  name: string;
  shortName?: string;
  competitions: Array<{
    competitors: EspnCompetitor[];
    status?: { period?: number; type?: { state?: string } };
  }>;
}

/**
 * Fetch the current PGA scoreboard from ESPN.
 * Returns parsed golfer data for all competitors.
 */
export async function fetchEspnGolfScores(): Promise<{
  golfers: EspnGolferData[];
  tournamentName: string;
  currentRound: number;
}> {
  const res = await fetch(ESPN_GOLF_SCOREBOARD, {
    headers: { 'User-Agent': 'Sportsblock/1.0' },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`ESPN API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const events: EspnEvent[] = data.events || [];

  if (events.length === 0) {
    throw new Error('No active PGA event found on ESPN');
  }

  const event = events[0];
  const competition = event.competitions?.[0];
  if (!competition) {
    throw new Error('No competition data found in ESPN event');
  }

  const currentRound = competition.status?.period ?? 1;
  const competitors = competition.competitors || [];

  const golfers: EspnGolferData[] = competitors.map((c) => {
    const rounds: Record<number, { display: string; strokes: number }> = {};
    let maxRound = 0;

    if (c.linescores) {
      for (const ls of c.linescores) {
        rounds[ls.period] = {
          display: ls.displayValue,
          strokes: ls.value,
        };
        if (ls.period > maxRound) maxRound = ls.period;
      }
    }

    // Parse total score relative to par
    const scoreDisplay = c.score || 'E';
    let scoreRelToPar = 0;
    if (scoreDisplay === 'E') {
      scoreRelToPar = 0;
    } else {
      const parsed = parseInt(scoreDisplay, 10);
      if (!isNaN(parsed)) scoreRelToPar = parsed;
    }

    // Infer status: if tournament is past round 2 and golfer has fewer rounds, they were cut
    let status: EspnGolferData['status'] = 'active';
    if (currentRound > 2 && maxRound <= 2 && maxRound > 0) {
      status = 'cut';
    }

    // Determine thru (holes completed in current round)
    const thru = maxRound >= currentRound ? 18 : 0;

    return {
      espnName: c.athlete.displayName || c.athlete.fullName || 'Unknown',
      espnId: c.id,
      order: c.order,
      scoreRelToPar,
      scoreDisplay,
      rounds,
      status,
      thru,
      currentRound: maxRound,
    };
  });

  logger.info(`Fetched ${golfers.length} golfers from ESPN: ${event.name}`, 'golf-api', {
    tournamentName: event.name,
    currentRound,
  });

  return {
    golfers,
    tournamentName: event.name || 'Unknown Tournament',
    currentRound,
  };
}

// ============================================================================
// Name Matching
// ============================================================================

/**
 * Normalize a name for fuzzy matching: lowercase, strip diacritics, remove dots/hyphens.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[.\-']/g, '') // remove dots, hyphens, apostrophes
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match ESPN golfers to database ContestTeam records.
 * Uses normalized name comparison + manual overrides.
 */
export function matchGolfersToTeams(
  espnGolfers: EspnGolferData[],
  dbTeams: Array<{ code: string; name: string }>,
  nameOverrides: Record<string, string>
): {
  matched: Array<{ teamCode: string; espnData: EspnGolferData }>;
  unmatched: string[];
} {
  // Build normalized name → code lookup from DB teams
  const nameToCode = new Map<string, string>();
  for (const team of dbTeams) {
    nameToCode.set(normalizeName(team.name), team.code);
  }

  const matched: Array<{ teamCode: string; espnData: EspnGolferData }> = [];
  const unmatched: string[] = [];

  for (const golfer of espnGolfers) {
    // Check manual override first
    const overrideCode = nameOverrides[golfer.espnName];
    if (overrideCode) {
      matched.push({ teamCode: overrideCode, espnData: golfer });
      continue;
    }

    // Try normalized name match
    const normalized = normalizeName(golfer.espnName);
    const code = nameToCode.get(normalized);
    if (code) {
      matched.push({ teamCode: code, espnData: golfer });
      continue;
    }

    // Try matching by last name only (handles "J.J. Spaun" vs "JJ Spaun" etc.)
    const lastNameNorm = normalized.split(' ').pop() || '';
    let lastNameMatch: string | undefined;
    for (const [dbNorm, dbCode] of nameToCode) {
      const dbLastName = dbNorm.split(' ').pop() || '';
      if (dbLastName === lastNameNorm && lastNameNorm.length >= 3) {
        // Avoid false positives on very short last names
        if (!lastNameMatch) {
          lastNameMatch = dbCode;
        } else {
          // Ambiguous — multiple DB entries share last name, skip
          lastNameMatch = undefined;
          break;
        }
      }
    }

    if (lastNameMatch) {
      matched.push({ teamCode: lastNameMatch, espnData: golfer });
      continue;
    }

    unmatched.push(golfer.espnName);
  }

  return { matched, unmatched };
}

/**
 * Extract the GolfScoringState from a contest's typeConfig JSON.
 */
export function getGolfScoringState(typeConfig: unknown): GolfScoringState {
  if (!typeConfig || typeof typeConfig !== 'object') return { ...DEFAULT_GOLF_SCORING_STATE };
  const config = typeConfig as Record<string, unknown>;
  const gs = config.golfScoring;
  if (!gs || typeof gs !== 'object') return { ...DEFAULT_GOLF_SCORING_STATE };
  return gs as GolfScoringState;
}
