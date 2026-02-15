import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEvents } from '@/lib/sports/thesportsdb';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import {
  MATCH_THREAD_CONFIG,
  getMatchThreadPermlink,
  isThreadOpen,
} from '@/lib/hive-workerbee/match-threads';
import { MatchThread } from '@/types/sports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/match-threads/[eventId]
 *
 * Returns a single match thread by event ID.
 * Much cheaper than fetching all threads — only checks one Hive container.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // fetchAllEvents has built-in revalidation caching (300s on league fetches)
    const { events, liveEventIds } = await fetchAllEvents();
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    // Check single Hive container
    const permlink = getMatchThreadPermlink(eventId);
    let biteCount = 0;

    try {
      const content = await makeHiveApiCall<Record<string, unknown>>(
        'condenser_api',
        'get_content',
        [MATCH_THREAD_CONFIG.PARENT_AUTHOR, permlink]
      );

      if (content && content.author && (content.body as string)?.length > 0) {
        biteCount = (content.children as number) || 0;
      }
    } catch {
      // Container doesn't exist yet — that's fine
    }

    const matchThread: MatchThread = {
      eventId: event.id,
      permlink,
      event,
      biteCount,
      isOpen: isThreadOpen(event.date, event.status),
      isLive: liveEventIds.has(event.id) || event.status === 'live',
    };

    return NextResponse.json(
      { success: true, matchThread },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[MatchThread] Failed to fetch:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch match thread',
      },
      { status: 500 }
    );
  }
}
