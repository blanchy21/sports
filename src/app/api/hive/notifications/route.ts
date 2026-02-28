import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api/response';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache configuration - 30 seconds for notifications (balance between freshness and performance)
const CACHE_DURATION = 30 * 1000;

// Per-user notification cache
interface NotificationCache {
  notifications: NotificationItem[];
  count: number;
  timestamp: number;
  expiresAt: number;
}

const notificationCache = new Map<string, NotificationCache>();
const MAX_NOTIFICATION_CACHE_SIZE = 200;
let notificationRequestCount = 0;

/** Evict oldest entry when cache exceeds max size */
function boundedCacheSet<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number) {
  if (map.size >= maxSize) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

// Cleanup old cache entries periodically
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of notificationCache.entries()) {
    // Remove entries that are more than 5 minutes old
    if (now - entry.timestamp > 5 * 60 * 1000) {
      notificationCache.delete(key);
    }
  }
}

const querySchema = z.object({
  username: z.string().min(3).max(16),
  since: z.string().nullish(), // ISO timestamp to filter notifications after
  limit: z.coerce.number().min(1).max(100).default(50),
});

interface AccountHistoryEntry {
  op: [string, Record<string, unknown>];
  timestamp: string;
  trx_id: string;
  block: number;
}

interface NotificationItem {
  id: string;
  type: 'vote' | 'comment' | 'mention' | 'transfer' | 'reblog' | 'short_reply';
  title: string;
  message: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Helper to check if a permlink belongs to a short
function isShortPermlink(permlink: string): boolean {
  return typeof permlink === 'string' && permlink.startsWith('short-');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const ROUTE = '/api/hive/notifications';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);
  const searchParams = request.nextUrl.searchParams;

  // Parse and validate query parameters
  const parseResult = querySchema.safeParse({
    username: searchParams.get('username'),
    since: searchParams.get('since'),
    limit: searchParams.get('limit') || 50,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid parameters', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { username, since, limit } = parseResult.data;
  const parsedSince = since ? new Date(since) : null;
  const sinceDate = parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince : null;
  const now = Date.now();

  // Deterministic cleanup every 20 requests
  if (++notificationRequestCount % 20 === 0) cleanupCache();

  // Generate cache key based on username and since parameter
  const cacheKey = `${username}:${since || 'all'}:${limit}`;
  const cached = notificationCache.get(cacheKey);

  // Return cached data if valid
  if (cached && now < cached.expiresAt) {
    return NextResponse.json({
      success: true,
      notifications: cached.notifications,
      count: cached.count,
      username,
      cached: true,
      timestamp: cached.timestamp,
    });
  }

  try {
    // Fetch account history - get more entries than limit since we'll filter
    const batchSize = Math.min(limit * 3, 500);

    const history = await retryWithBackoff(
      () =>
        makeHiveApiCall<Array<[number, AccountHistoryEntry]>>(
          'condenser_api',
          'get_account_history',
          [username, -1, batchSize]
        ),
      { maxRetries: 2, initialDelay: 500 }
    );

    if (!history || !Array.isArray(history)) {
      return NextResponse.json({
        success: true,
        notifications: [],
        count: 0,
        cached: false,
      });
    }

    const notifications: NotificationItem[] = [];

    // Process history entries in reverse order (newest first)
    for (let i = history.length - 1; i >= 0 && notifications.length < limit; i--) {
      const [, entry] = history[i];
      if (!entry || !entry.op) continue;

      const [opType, opData] = entry.op;
      const timestamp = entry.timestamp + 'Z'; // Add timezone

      // Skip if before since date
      if (sinceDate && new Date(timestamp) <= sinceDate) {
        continue;
      }

      const notification = processOperation(opType, opData, username, timestamp, entry.trx_id);
      if (notification) {
        notifications.push(notification);
      }
    }

    // Cache the results (bounded to prevent unbounded growth)
    boundedCacheSet(
      notificationCache,
      cacheKey,
      {
        notifications,
        count: notifications.length,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      },
      MAX_NOTIFICATION_CACHE_SIZE
    );

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
      username,
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    ctx.log.error('Failed to fetch notifications', error, { username });

    // Try to return stale cache data on error (graceful degradation)
    const staleCache = notificationCache.get(cacheKey);
    if (staleCache) {
      return NextResponse.json({
        success: true,
        notifications: staleCache.notifications,
        count: staleCache.count,
        username,
        cached: true,
        stale: true,
        timestamp: staleCache.timestamp,
      });
    }

    return ctx.handleError(error);
  }
}

/**
 * Process a blockchain operation into a notification
 */
function processOperation(
  opType: string,
  opData: unknown,
  username: string,
  timestamp: string,
  trxId: string
): NotificationItem | null {
  if (!isRecord(opData)) {
    return null;
  }

  switch (opType) {
    case 'vote': {
      // Only notify if someone voted on the user's content
      if (opData.author === username && opData.voter !== username) {
        const weight = Number(opData.weight) / 100;
        const isUpvote = weight > 0;
        return {
          id: `vote-${trxId}`,
          type: 'vote',
          title: isUpvote ? 'New Upvote' : 'New Downvote',
          message: `@${opData.voter} ${isUpvote ? 'upvoted' : 'downvoted'} your post (${Math.abs(weight).toFixed(0)}%)`,
          timestamp,
          data: {
            voter: opData.voter,
            author: opData.author,
            permlink: opData.permlink,
            weight,
          },
        };
      }
      break;
    }

    case 'comment': {
      // Only notify for replies to the user's content (not their own comments)
      if (opData.parent_author === username && opData.author !== username) {
        const parentPermlink = String(opData.parent_permlink || '');
        const isShortReply = isShortPermlink(parentPermlink);
        const bodyPreview = String(opData.body || '').slice(0, 100);

        return {
          id: `comment-${trxId}`,
          type: isShortReply ? 'short_reply' : 'comment',
          title: isShortReply ? '💬 Reply to your Short' : 'New Reply',
          message: isShortReply
            ? `@${opData.author} replied: "${bodyPreview}${bodyPreview.length >= 100 ? '...' : ''}"`
            : `@${opData.author} replied to your post`,
          timestamp,
          data: {
            author: opData.author,
            permlink: opData.permlink,
            parentAuthor: opData.parent_author,
            parentPermlink: opData.parent_permlink,
            body: String(opData.body || '').slice(0, 200),
            isShort: isShortReply,
          },
        };
      }
      break;
    }

    case 'transfer': {
      // Notify for incoming transfers
      if (opData.to === username && opData.from !== username) {
        return {
          id: `transfer-${trxId}`,
          type: 'transfer',
          title: 'Transfer Received',
          message: `@${opData.from} sent you ${opData.amount}`,
          timestamp,
          data: {
            from: opData.from,
            to: opData.to,
            amount: opData.amount,
            memo: opData.memo,
          },
        };
      }
      break;
    }

    case 'custom_json': {
      // Check for reblogs
      if (opData.id === 'follow' || opData.id === 'reblog') {
        try {
          const json = JSON.parse(String(opData.json || '[]'));
          if (Array.isArray(json) && json[0] === 'reblog') {
            const reblogData = json[1] as { account?: string; author?: string; permlink?: string };
            if (reblogData.author === username && reblogData.account !== username) {
              return {
                id: `reblog-${trxId}`,
                type: 'reblog',
                title: 'Reblogged',
                message: `@${reblogData.account} reblogged your post`,
                timestamp,
                data: {
                  account: reblogData.account,
                  author: reblogData.author,
                  permlink: reblogData.permlink,
                },
              };
            }
          }
        } catch {
          // Invalid JSON, skip
        }
      }
      break;
    }
  }

  return null;
}
