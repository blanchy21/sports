import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchFollowingFeed } from '@/lib/hive-workerbee/content';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { parseSearchParams } from '@/lib/api/validation';
import { createRequestContext, validationError } from '@/lib/api/response';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'private, s-maxage=30',
};

const ROUTE = '/api/hive/feed';

const feedQuerySchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(16, 'Username must be at most 16 characters')
    .regex(/^[a-z][a-z0-9.-]*[a-z0-9]$|^[a-z]$/, 'Invalid Hive username format')
    .transform((val) => val.toLowerCase()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(20)),
  start_author: z.string().max(16).optional().default(''),
  start_permlink: z.string().max(256).optional().default(''),
});

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.read, 'feed');

  if (!rateLimit.success) {
    ctx.log.warn('Rate limit exceeded', { clientId, reset: rateLimit.reset });
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: createRateLimitHeaders(0, rateLimit.reset, RATE_LIMITS.read.limit),
      }
    );
  }

  // Validate query params
  const parseResult = parseSearchParams(request.nextUrl.searchParams, feedQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username, limit, start_author, start_permlink } = parseResult.data;

  try {
    ctx.log.debug('Fetching following feed', { username, limit });

    const result = await retryWithBackoff(
      () => fetchFollowingFeed(username, limit, start_author, start_permlink),
      { maxRetries: 2, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 }
    );

    return NextResponse.json(
      {
        success: true,
        posts: result.posts,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        count: result.posts.length,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    ctx.log.error('Request failed', error instanceof Error ? error : undefined);
    return ctx.handleError(error);
  }
}
