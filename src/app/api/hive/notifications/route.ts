import { NextRequest, NextResponse } from 'next/server';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  username: z.string().min(3).max(16),
  since: z.string().optional(), // ISO timestamp to filter notifications after
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
  type: 'vote' | 'comment' | 'mention' | 'transfer' | 'reblog';
  title: string;
  message: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export async function GET(request: NextRequest) {
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

  try {
    // Fetch account history - get more entries than limit since we'll filter
    const batchSize = Math.min(limit * 3, 500);

    const history = await retryWithBackoff(
      () => makeHiveApiCall<Array<[number, AccountHistoryEntry]>>(
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

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
      username,
    });
  } catch (error) {
    console.error('[API] Error fetching notifications:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message,
      notifications: [],
      count: 0,
      username,
    });
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
        return {
          id: `comment-${trxId}`,
          type: 'comment',
          title: 'New Reply',
          message: `@${opData.author} replied to your post`,
          timestamp,
          data: {
            author: opData.author,
            permlink: opData.permlink,
            parentAuthor: opData.parent_author,
            parentPermlink: opData.parent_permlink,
            body: String(opData.body || '').slice(0, 200),
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
