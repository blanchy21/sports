import { NextResponse } from 'next/server';
import { fetchAllEvents, fetchEventSummary } from '@/lib/sports/espn';
import { isCricketEventId } from '@/lib/sports/cricket';
import { createApiHandler } from '@/lib/api/response';
import type { MatchDetail } from '@/types/sports';
import type { ApiResponse } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/match-threads/[eventId]/details';

const EMPTY_DETAIL: MatchDetail = {
  events: [],
  stats: [],
  homeLineup: null,
  awayLineup: null,
};

/**
 * GET /api/match-threads/[eventId]/details
 *
 * Returns match events (goals/cards/subs), stats, and lineups for a soccer event.
 * Non-soccer events return empty data.
 */
export const GET = createApiHandler(ROUTE, async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const eventId = segments[3]; // /api/match-threads/[eventId]/details

  // Cricket (IPL) events have no ESPN summary data — return empty detail
  // immediately without hitting ESPN. MatchDetailTabs hides itself for
  // non-soccer events, so the empty body is never rendered.
  if (isCricketEventId(eventId)) {
    return NextResponse.json<ApiResponse<{ detail: MatchDetail }>>(
      { success: true, detail: EMPTY_DETAIL },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  }

  const { events } = await fetchAllEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return NextResponse.json<ApiResponse<{ detail: MatchDetail }>>(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  // Only soccer events have detailed summary data
  if (event.espnSport !== 'soccer' || !event.leagueSlug) {
    return NextResponse.json<ApiResponse<{ detail: MatchDetail }>>(
      { success: true, detail: EMPTY_DETAIL },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  }

  const isLive = event.status === 'live';
  const detail = await fetchEventSummary(event.espnSport, event.leagueSlug, eventId, isLive);

  // Cache: 30s live, 60s upcoming, 300s finished
  const maxAge = isLive ? 30 : event.status === 'upcoming' ? 60 : 300;
  const stale = maxAge * 2;

  return NextResponse.json<ApiResponse<{ detail: MatchDetail }>>(
    { success: true, detail: detail ?? EMPTY_DETAIL },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${stale}`,
      },
    }
  );
});
