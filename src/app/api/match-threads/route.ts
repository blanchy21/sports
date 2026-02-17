import { NextResponse } from 'next/server';
import { fetchAllEvents } from '@/lib/sports/thesportsdb';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import {
  MATCH_THREAD_CONFIG,
  getMatchThreadPermlink,
  isThreadOpen,
} from '@/lib/hive-workerbee/match-threads';
import { MatchThread, SportsEvent } from '@/types/sports';

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
      if (event.status === 'finished' && eventTime >= past24h) return true;

      return false;
    });

    // Batch-check which events have Hive containers (for bite counts)
    const containerChecks = await Promise.allSettled(
      relevantEvents.map(async (event) => {
        const permlink = getMatchThreadPermlink(event.id);
        const content = await makeHiveApiCall<Record<string, unknown>>(
          'condenser_api',
          'get_content',
          [MATCH_THREAD_CONFIG.PARENT_AUTHOR, permlink]
        );
        const hasContainer = !!(content && content.author && (content.body as string)?.length > 0);
        const biteCount = hasContainer ? (content.children as number) || 0 : 0;
        return { event, biteCount };
      })
    );

    const matchThreads: MatchThread[] = [];

    for (const result of containerChecks) {
      if (result.status !== 'fulfilled') continue;
      const { event, biteCount } = result.value;

      matchThreads.push({
        eventId: event.id,
        permlink: getMatchThreadPermlink(event.id),
        event,
        biteCount,
        isOpen: isThreadOpen(event.date, event.status),
        isLive: liveEventIds.has(event.id) || event.status === 'live',
      });
    }

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

    return NextResponse.json(
      { success: true, matchThreads },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[MatchThreads] Failed to fetch:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch match threads',
        matchThreads: [],
      },
      { status: 500 }
    );
  }
}
