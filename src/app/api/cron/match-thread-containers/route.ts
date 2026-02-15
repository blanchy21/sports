import { NextResponse } from 'next/server';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { broadcastWithKey } from '@/lib/hive-workerbee/broadcast';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import { fetchAllEvents } from '@/lib/sports/thesportsdb';
import {
  MATCH_THREAD_CONFIG,
  getMatchThreadPermlink,
  buildMatchThreadBody,
  buildMatchThreadMetadata,
  isHiveDuplicateError,
} from '@/lib/hive-workerbee/match-threads';
import { SPORTSBITES_CONFIG } from '@/lib/hive-workerbee/sportsbites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint: creates match thread container posts for upcoming/live events.
 *
 * Runs every 30 minutes. For each event starting within the next 2 hours or
 * currently live, creates a container post on @sportsbites if one doesn't exist.
 */
export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  const postingKey = process.env.SPORTSBITES_POSTING_KEY;
  if (!postingKey) {
    return NextResponse.json(
      { success: false, error: 'SPORTSBITES_POSTING_KEY not configured' },
      { status: 503 }
    );
  }

  try {
    console.log('[Cron] Checking for match thread containers to create...');

    const { events, liveEventIds } = await fetchAllEvents();
    const now = Date.now();
    const preCreateWindow = MATCH_THREAD_CONFIG.PRE_CREATE_HOURS * 60 * 60 * 1000;

    // Filter to events that need containers: live OR starting within PRE_CREATE_HOURS
    const eventsNeedingContainers = events.filter((event) => {
      if (liveEventIds.has(event.id)) return true;
      if (event.status === 'live') return true;

      const eventTime = new Date(event.date).getTime();
      const timeUntilEvent = eventTime - now;
      return timeUntilEvent > 0 && timeUntilEvent <= preCreateWindow;
    });

    if (eventsNeedingContainers.length === 0) {
      console.log('[Cron] No events need match thread containers');
      return NextResponse.json({
        success: true,
        message: 'No events need containers',
        created: 0,
        skipped: 0,
      });
    }

    let created = 0;
    let skipped = 0;
    const results: { eventId: string; status: string; error?: string }[] = [];

    for (const event of eventsNeedingContainers) {
      const permlink = getMatchThreadPermlink(event.id);

      try {
        // Idempotency check
        const existing = await makeHiveApiCall<Record<string, unknown>>(
          'condenser_api',
          'get_content',
          [MATCH_THREAD_CONFIG.PARENT_AUTHOR, permlink]
        );

        if (existing && existing.author && (existing.body as string)?.length > 0) {
          skipped++;
          results.push({ eventId: event.id, status: 'exists' });
          continue;
        }

        // Build container post
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
          created++;
          console.log(
            `[Cron] Created match thread for ${event.id} (${event.name}): tx=${result.transactionId}`
          );
          results.push({ eventId: event.id, status: 'created' });
        } else {
          // Duplicate means it already exists
          if (isHiveDuplicateError(result.error)) {
            skipped++;
            results.push({ eventId: event.id, status: 'exists' });
          } else {
            results.push({ eventId: event.id, status: 'error', error: result.error });
          }
        }
      } catch (error) {
        results.push({
          eventId: event.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[Cron] Match thread containers: created=${created}, skipped=${skipped}`);

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: eventsNeedingContainers.length,
      results,
    });
  } catch (error) {
    console.error('[Cron] Match thread container creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
