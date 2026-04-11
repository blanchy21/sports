/**
 * Cricket (IPL) match source — Prisma-backed.
 *
 * ESPN's public scoreboard API does not expose cricket, so IPL matches for
 * the match-threads feature come from the `IplBbMatch` Postgres table that
 * already backs the IPL Boundary Blackjack contest. Any fixture created via
 * the IPL BB admin UI (`/admin/ipl-bb`) automatically surfaces in match
 * threads once its kickoff time enters the 48h upcoming window.
 *
 * Event IDs are prefixed with `iplbb-` so they cannot collide with ESPN
 * numeric IDs and Hive container permlinks (`match-iplbb-{cuid}`) are
 * visibly distinct.
 */

import { prisma } from '@/lib/db/prisma';
import type { SportsEvent } from '@/types/sports';

export const CRICKET_EVENT_ID_PREFIX = 'iplbb-';
export const CRICKET_ICON = '\uD83C\uDFCF';
export const CRICKET_SPORT = 'Cricket';
export const CRICKET_LEAGUE = 'Indian Premier League';
export const CRICKET_ESPN_SPORT = 'cricket';

export function toPrefixedCricketId(id: string): string {
  return `${CRICKET_EVENT_ID_PREFIX}${id}`;
}

export function fromPrefixedCricketId(eventId: string): string | null {
  if (!eventId.startsWith(CRICKET_EVENT_ID_PREFIX)) return null;
  return eventId.slice(CRICKET_EVENT_ID_PREFIX.length);
}

export function isCricketEventId(eventId: string): boolean {
  return eventId.startsWith(CRICKET_EVENT_ID_PREFIX);
}

/**
 * Map IplBbMatch.status to SportsEvent.status.
 *
 * - `upcoming`, `open` → `upcoming` (picks open, ball not bowled)
 * - `locked` → `live` (picks closed, match in progress)
 * - `resolved`, `abandoned` → `finished`
 */
function mapCricketStatus(status: string): SportsEvent['status'] {
  switch (status) {
    case 'locked':
      return 'live';
    case 'resolved':
    case 'abandoned':
      return 'finished';
    case 'upcoming':
    case 'open':
    default:
      return 'upcoming';
  }
}

type IplBbMatchRow = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  kickoffTime: Date;
  status: string;
  fours: number | null;
  sixes: number | null;
};

export function mapIplBbMatchToSportsEvent(match: IplBbMatchRow): SportsEvent {
  const status = mapCricketStatus(match.status);
  let statusDetail: string | undefined;
  if (match.status === 'resolved' && match.fours != null && match.sixes != null) {
    statusDetail = `Final · ${match.fours}×4 ${match.sixes}×6`;
  } else if (match.status === 'abandoned') {
    statusDetail = 'Abandoned';
  } else if (status === 'live') {
    statusDetail = 'Live';
  }

  return {
    id: toPrefixedCricketId(match.id),
    name: `${match.homeTeam} vs ${match.awayTeam}`,
    date: match.kickoffTime.toISOString(),
    icon: CRICKET_ICON,
    sport: CRICKET_SPORT,
    league: CRICKET_LEAGUE,
    // Intentionally omit leagueSlug — details route uses its absence to
    // short-circuit ESPN summary fetch.
    espnSport: CRICKET_ESPN_SPORT,
    teams: {
      home: match.homeTeam,
      away: match.awayTeam,
    },
    venue: match.venue ?? undefined,
    status,
    statusDetail,
  };
}

/**
 * Fetch IPL matches in a wide window (past 3d → next 7d) and map to
 * SportsEvent shape. The match-threads route applies the final 48h-upcoming
 * / 24h-finished filter downstream.
 *
 * DB errors are swallowed and return empty arrays, matching the ESPN
 * failure-fallback behaviour in `fetchLeagueScoreboard`.
 */
export async function fetchCricketEvents(): Promise<{
  events: SportsEvent[];
  liveEventIds: Set<string>;
}> {
  const now = new Date();
  const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const matches = await prisma.iplBbMatch.findMany({
      where: {
        kickoffTime: { gte: from, lte: to },
      },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        venue: true,
        kickoffTime: true,
        status: true,
        fours: true,
        sixes: true,
      },
      orderBy: { kickoffTime: 'asc' },
    });

    const events: SportsEvent[] = [];
    const liveEventIds = new Set<string>();

    for (const match of matches) {
      const event = mapIplBbMatchToSportsEvent(match);
      events.push(event);
      if (event.status === 'live') {
        liveEventIds.add(event.id);
      }
    }

    return { events, liveEventIds };
  } catch (error) {
    console.error('[cricket] fetchCricketEvents failed:', error);
    return { events: [], liveEventIds: new Set() };
  }
}
