import { NextRequest, NextResponse } from 'next/server';
import {
  fetchSportsbites,
  getSportsbite,
  SPORTSBITES_CONFIG,
  SportsbiteApiResponse,
} from '@/lib/hive-workerbee/sportsbites';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache configuration
const CACHE_DURATION = 20 * 1000; // 20s for aggregated feed
const SINGLE_CACHE_DURATION = 30 * 1000;

interface FeedCache {
  data: SportsbiteApiResponse | null;
  timestamp: number;
  expiresAt: number;
}

const feedCache = new Map<string, FeedCache>();
const singleCache = new Map<string, { data: unknown; expiresAt: number }>();

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of feedCache.entries()) {
    if (now > entry.expiresAt) feedCache.delete(key);
  }
  for (const [key, entry] of singleCache.entries()) {
    if (now > entry.expiresAt) singleCache.delete(key);
  }
}

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  before: z.string().optional(),
  author: z.string().optional(),
  permlink: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const parseResult = querySchema.safeParse({
    limit: searchParams.get('limit') || 20,
    before: searchParams.get('before') || undefined,
    author: searchParams.get('author') || undefined,
    permlink: searchParams.get('permlink') || undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid parameters',
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { limit, before, author, permlink } = parseResult.data;
  const now = Date.now();

  if (Math.random() < 0.1) cleanupCache();

  try {
    // Single sportsbite lookup
    if (author && permlink) {
      const cacheKey = `${author}/${permlink}`;
      const cached = singleCache.get(cacheKey);

      if (cached && now < cached.expiresAt) {
        return NextResponse.json({
          success: true,
          sportsbite: cached.data,
          cached: true,
        });
      }

      const sportsbite = await retryWithBackoff(() => getSportsbite(author, permlink), {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2,
      });

      if (sportsbite) {
        singleCache.set(cacheKey, {
          data: sportsbite,
          expiresAt: now + SINGLE_CACHE_DURATION,
        });
      }

      return NextResponse.json({
        success: true,
        sportsbite: sportsbite || null,
        cached: false,
      });
    }

    // Feed lookup (rolling 7-day aggregation)
    const feedCacheKey = `feed:${limit}:${before || 'latest'}:${author || 'all'}`;
    const cachedFeed = feedCache.get(feedCacheKey);

    if (cachedFeed && now < cachedFeed.expiresAt && cachedFeed.data) {
      return NextResponse.json({
        success: cachedFeed.data.success,
        sportsbites: cachedFeed.data.sportsbites,
        hasMore: cachedFeed.data.hasMore,
        nextCursor: cachedFeed.data.nextCursor,
        count: cachedFeed.data.count,
        config: {
          maxChars: SPORTSBITES_CONFIG.MAX_CHARS,
          parentAuthor: SPORTSBITES_CONFIG.PARENT_AUTHOR,
        },
        cached: true,
        timestamp: cachedFeed.timestamp,
      });
    }

    const result = await retryWithBackoff(() => fetchSportsbites({ limit, before, author }), {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
    });

    feedCache.set(feedCacheKey, {
      data: result,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    });

    return NextResponse.json({
      success: result.success,
      sportsbites: result.sportsbites,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      count: result.count,
      config: {
        maxChars: SPORTSBITES_CONFIG.MAX_CHARS,
        parentAuthor: SPORTSBITES_CONFIG.PARENT_AUTHOR,
      },
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    console.error('[Sportsbites API] Error:', error);

    // Stale-while-error
    const feedCacheKey = `feed:${limit}:${before || 'latest'}:${author || 'all'}`;
    const staleCache = feedCache.get(feedCacheKey);

    if (staleCache?.data) {
      return NextResponse.json({
        success: staleCache.data.success,
        sportsbites: staleCache.data.sportsbites,
        hasMore: staleCache.data.hasMore,
        nextCursor: staleCache.data.nextCursor,
        count: staleCache.data.count,
        config: {
          maxChars: SPORTSBITES_CONFIG.MAX_CHARS,
          parentAuthor: SPORTSBITES_CONFIG.PARENT_AUTHOR,
        },
        cached: true,
        stale: true,
        timestamp: staleCache.timestamp,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sportsbites',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
