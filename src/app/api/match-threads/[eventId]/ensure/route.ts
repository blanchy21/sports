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
import { fetchAllEvents } from '@/lib/sports/espn';
import { fetchCricketEvents, isCricketEventId } from '@/lib/sports/cricket';
import { createApiHandler } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { validateCsrf } from '@/lib/api/csrf';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache of known-created container permlinks for this process.
const createdContainers = new Set<string>();

const ROUTE = '/api/match-threads/[eventId]/ensure';

/**
 * POST /api/match-threads/[eventId]/ensure
 *
 * Ensures a match thread container exists on Hive.
 * Fallback for when the cron hasn't run yet.
 * Requires authentication.
 */
export const POST = createApiHandler(ROUTE, async (request) => {
  // Authentication check
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // CSRF validation
  if (!validateCsrf(request as NextRequest)) {
    return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
  }

  // Rate limiting
  const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.write, 'matchThreadEnsure');
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: createRateLimitHeaders(
          rateLimit.remaining,
          rateLimit.reset,
          RATE_LIMITS.write.limit
        ),
      }
    );
  }

  const postingKey = process.env.SPORTSBITES_POSTING_KEY;
  if (!postingKey) {
    return NextResponse.json(
      { success: false, error: 'Sportsbites posting key not configured' },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const eventId = segments[3]; // /api/match-threads/[eventId]/ensure
  const permlink = getMatchThreadPermlink(eventId);

  // Fast path: already created in this process
  if (createdContainers.has(permlink)) {
    return NextResponse.json({ success: true, permlink, alreadyExists: true });
  }

  // Fetch event data to build the container. Cricket events come from the
  // IplBbMatch Postgres table; only query that source for cricket-prefixed IDs.
  const { events } = isCricketEventId(eventId)
    ? await fetchCricketEvents()
    : await fetchAllEvents();
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
});
