import { NextRequest, NextResponse } from 'next/server';
import { broadcastWithKey } from '@/lib/hive-workerbee/broadcast';
import { SPORTSBITES_CONFIG } from '@/lib/hive-workerbee/sportsbites';
import {
  MATCH_THREAD_CONFIG,
  getMatchThreadPermlink,
  buildMatchThreadBody,
  buildMatchThreadMetadata,
  isHiveDuplicateError,
} from '@/lib/hive-workerbee/match-threads';
import { fetchAllEvents } from '@/lib/sports/thesportsdb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache of known-created container permlinks for this process.
const createdContainers = new Set<string>();

/**
 * POST /api/match-threads/[eventId]/ensure
 *
 * Ensures a match thread container exists on Hive.
 * Fallback for when the cron hasn't run yet.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const postingKey = process.env.SPORTSBITES_POSTING_KEY;
  if (!postingKey) {
    return NextResponse.json(
      { success: false, error: 'Sportsbites posting key not configured' },
      { status: 503 }
    );
  }

  try {
    const { eventId } = await params;
    const permlink = getMatchThreadPermlink(eventId);

    // Fast path: already created in this process
    if (createdContainers.has(permlink)) {
      return NextResponse.json({ success: true, permlink, alreadyExists: true });
    }

    // Fetch event data from TheSportsDB to build the container
    const { events } = await fetchAllEvents();
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return NextResponse.json(
        { success: false, error: `Event ${eventId} not found` },
        { status: 404 }
      );
    }

    const title = event.teams
      ? `Match Thread: ${event.teams.home} vs ${event.teams.away}`
      : `Match Thread: ${event.name}`;

    const body = buildMatchThreadBody(event);
    const metadata = buildMatchThreadMetadata(event);

    const result = await broadcastWithKey(
      [
        [
          'comment',
          {
            parent_author: '',
            parent_permlink: SPORTSBITES_CONFIG.COMMUNITY_ID,
            author: MATCH_THREAD_CONFIG.PARENT_AUTHOR,
            permlink,
            title,
            body,
            json_metadata: metadata,
          },
        ],
        [
          'comment_options',
          {
            author: MATCH_THREAD_CONFIG.PARENT_AUTHOR,
            permlink,
            max_accepted_payout: '0.000 HBD',
            percent_hbd: 10000,
            allow_votes: true,
            allow_curation_rewards: true,
            extensions: [],
          },
        ],
      ],
      postingKey
    );

    if (result.success) {
      createdContainers.add(permlink);
      return NextResponse.json({
        success: true,
        permlink,
        created: true,
        transactionId: result.transactionId,
      });
    }

    // Duplicate = already exists
    if (isHiveDuplicateError(result.error)) {
      createdContainers.add(permlink);
      return NextResponse.json({ success: true, permlink, alreadyExists: true });
    }

    throw new Error(result.error || 'Failed to create container');
  } catch (error) {
    console.error('[EnsureMatchThread] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure match thread container',
      },
      { status: 500 }
    );
  }
}
