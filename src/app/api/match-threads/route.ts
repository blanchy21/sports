import { NextResponse } from 'next/server';
import { fetchAllEvents } from '@/lib/sports/espn';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import {
  MATCH_THREAD_CONFIG,
  getMatchThreadPermlink,
  createMatchThread,
} from '@/lib/hive-workerbee/match-threads';
import { MatchThread, SportsEvent } from '@/types/sports';
import type { ApiResponse } from '@/types/api';
import { error as logError } from '@/lib/hive-workerbee/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/match-threads
 *
 * Returns match threads: live events, upcoming (next 48h), and recently
 * finished (last 24h). Batch-checks which have Hive containers.
 */
export async function GET() {
  try {
    const { events, liveEventIds } = await fetchAllEvents();
    const now = Date.now();
    const in48h = now + 48 * 60 * 60 * 1000;
    const past24h = now - 24 * 60 * 60 * 1000;

    // Filter to relevant events: live, upcoming (next 48h), or recently finished (past 24h)
    const relevantEvents = events.filter((event) => {
      if (liveEventIds.has(event.id) || event.status === 'live') return true;

      const eventTime = new Date(event.date).getTime();

      if (event.status === 'upcoming' && eventTime <= in48h) return true;

      // For finished events, use endDate (multi-day events like golf) or start date
      const endTime = event.endDate ? new Date(event.endDate).getTime() : eventTime;
      if (event.status === 'finished' && endTime >= past24h) return true;

      return false;
    });

    // Batch-check which events have Hive containers (for bite counts).
    // Container may not exist yet — get_content throws for non-existent posts,
    // so we catch errors and default to 0 bites.
    const containerChecks = await Promise.all(
      relevantEvents.map(async (event) => {
        let biteCount = 0;
        try {
          const permlink = getMatchThreadPermlink(event.id);
          const content = await makeHiveApiCall<Record<string, unknown>>(
            'condenser_api',
            'get_content',
            [MATCH_THREAD_CONFIG.PARENT_AUTHOR, permlink]
          );
          const hasContainer = !!(
            content &&
            content.author &&
            (content.body as string)?.length > 0
          );
          biteCount = hasContainer ? (content.children as number) || 0 : 0;
        } catch {
          // Container doesn't exist yet — this is expected for upcoming events
        }
        return { event, biteCount };
      })
    );

    const matchThreads: MatchThread[] = containerChecks.map(({ event, biteCount }) =>
      createMatchThread(event, biteCount, liveEventIds)
    );

    // Sort: live first, then upcoming by date, then recently finished
    matchThreads.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (b.isLive && !a.isLive) return 1;

      const statusOrder = (e: SportsEvent) => {
        if (e.status === 'live') return 0;
        if (e.status === 'upcoming') return 1;
        return 2;
      };

      const orderDiff = statusOrder(a.event) - statusOrder(b.event);
      if (orderDiff !== 0) return orderDiff;

      return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
    });

    return NextResponse.json<ApiResponse<{ matchThreads: MatchThread[] }>>(
      { success: true, matchThreads },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    logError(
      'Failed to fetch match threads',
      'MatchThreads',
      error instanceof Error ? error : undefined
    );
    return NextResponse.json<ApiResponse<{ matchThreads: MatchThread[] }>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch match threads',
      },
      { status: 500 }
    );
  }
}
