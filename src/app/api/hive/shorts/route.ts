import { NextRequest, NextResponse } from 'next/server';
import { fetchShorts, getShort, SHORTS_CONFIG, ShortsApiResponse } from '@/lib/hive-workerbee/shorts';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache configuration
const CACHE_DURATION = 15 * 1000; // 15 seconds for shorts feed (fresh content)
const SINGLE_SHORT_CACHE_DURATION = 30 * 1000; // 30 seconds for individual shorts

// In-memory cache for shorts feed
interface ShortsCache {
  data: ShortsApiResponse | null;
  timestamp: number;
  expiresAt: number;
}

// Cache keyed by limit+before combination for pagination support
const shortsFeedCache = new Map<string, ShortsCache>();

// Cache for individual shorts
const singleShortCache = new Map<string, { data: unknown; expiresAt: number }>();

// Clean up old cache entries periodically
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of shortsFeedCache.entries()) {
    if (now > entry.expiresAt) {
      shortsFeedCache.delete(key);
    }
  }
  for (const [key, entry] of singleShortCache.entries()) {
    if (now > entry.expiresAt) {
      singleShortCache.delete(key);
    }
  }
}

// Query parameter validation schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  before: z.string().optional(),
  author: z.string().optional(),
  permlink: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse and validate query parameters
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
        details: parseResult.error.flatten() 
      },
      { status: 400 }
    );
  }

  const { limit, before, author, permlink } = parseResult.data;
  const now = Date.now();

  // Periodically cleanup cache
  if (Math.random() < 0.1) cleanupCache();

  try {
    // Fetch a specific short if author and permlink provided
    if (author && permlink) {
      const cacheKey = `${author}/${permlink}`;
      const cached = singleShortCache.get(cacheKey);
      
      if (cached && now < cached.expiresAt) {
        return NextResponse.json({
          success: true,
          short: cached.data,
          cached: true,
        });
      }

      const short = await retryWithBackoff(
        () => getShort(author, permlink),
        {
          maxRetries: 2,
          initialDelay: 500,
          maxDelay: 5000,
          backoffMultiplier: 2,
        }
      );

      // Cache the result
      if (short) {
        singleShortCache.set(cacheKey, {
          data: short,
          expiresAt: now + SINGLE_SHORT_CACHE_DURATION,
        });
      }

      return NextResponse.json({
        success: true,
        short: short || null,
        cached: false,
      });
    }

    // Generate cache key for feed based on parameters
    const feedCacheKey = `feed:${limit}:${before || 'latest'}:${author || 'all'}`;
    const cachedFeed = shortsFeedCache.get(feedCacheKey);

    // Return cached data if valid
    if (cachedFeed && now < cachedFeed.expiresAt && cachedFeed.data) {
      return NextResponse.json({
        success: cachedFeed.data.success,
        shorts: cachedFeed.data.shorts,
        hasMore: cachedFeed.data.hasMore,
        nextCursor: cachedFeed.data.nextCursor,
        count: cachedFeed.data.count,
        config: {
          maxChars: SHORTS_CONFIG.MAX_CHARS,
          parentAuthor: SHORTS_CONFIG.PARENT_AUTHOR,
          parentPermlink: SHORTS_CONFIG.PARENT_PERMLINK,
        },
        cached: true,
        timestamp: cachedFeed.timestamp,
      });
    }

    // Fetch shorts feed
    const result = await retryWithBackoff(
      () => fetchShorts({ limit, before, author }),
      {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2,
      }
    );

    // Cache the result
    shortsFeedCache.set(feedCacheKey, {
      data: result,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    });

    return NextResponse.json({
      success: result.success,
      shorts: result.shorts,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      count: result.count,
      config: {
        maxChars: SHORTS_CONFIG.MAX_CHARS,
        parentAuthor: SHORTS_CONFIG.PARENT_AUTHOR,
        parentPermlink: SHORTS_CONFIG.PARENT_PERMLINK,
      },
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    console.error('[Shorts API] Error:', error);
    
    // Try to return stale cache data on error (graceful degradation)
    const feedCacheKey = `feed:${limit}:${before || 'latest'}:${author || 'all'}`;
    const staleCache = shortsFeedCache.get(feedCacheKey);
    
    if (staleCache?.data) {
      console.log('[Shorts API] Returning stale cache due to error');
      return NextResponse.json({
        success: staleCache.data.success,
        shorts: staleCache.data.shorts,
        hasMore: staleCache.data.hasMore,
        nextCursor: staleCache.data.nextCursor,
        count: staleCache.data.count,
        config: {
          maxChars: SHORTS_CONFIG.MAX_CHARS,
          parentAuthor: SHORTS_CONFIG.PARENT_AUTHOR,
          parentPermlink: SHORTS_CONFIG.PARENT_PERMLINK,
        },
        cached: true,
        stale: true,
        timestamp: staleCache.timestamp,
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch shorts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
