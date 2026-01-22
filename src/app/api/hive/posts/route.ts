import { NextRequest, NextResponse } from 'next/server';
import { fetchSportsblockPosts, getUserPosts } from '@/lib/hive-workerbee/content';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { postsQuerySchema, parseSearchParams } from '@/lib/api/validation';
import { createRequestContext, validationError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/posts';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const ctx = createRequestContext(ROUTE);
  const url = request.nextUrl.toString();

  console.log(`[${ROUTE}] Request started`, {
    requestId: ctx.requestId,
    url,
    timestamp: new Date().toISOString()
  });

  // Validate query parameters
  const parseResult = parseSearchParams(request.nextUrl.searchParams, postsQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username, author, permlink, limit, sort, sportCategory, tag, before } = parseResult.data;

  try {
    // Fetch a specific post
    if (author && permlink) {
      ctx.log.debug('Fetching single post', { author, permlink });

      const { fetchPost } = await import('@/lib/hive-workerbee/content');
      const post = await retryWithBackoff(
        () => fetchPost(author, permlink),
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        post: post || null,
      });
    }

    // Fetch user's posts
    if (username) {
      ctx.log.debug('Fetching user posts', { username, limit });

      const posts = await retryWithBackoff(
        () => getUserPosts(username, limit),
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        posts: posts || [],
        count: posts?.length || 0,
        username,
      });
    }

    // Fetch posts with filters
    ctx.log.debug('Fetching filtered posts', { limit, sort, sportCategory, tag });

    const result = await retryWithBackoff(
      () => fetchSportsblockPosts({
        limit,
        sort,
        sportCategory,
        tag,
        before,
      }),
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );

    return NextResponse.json({
      success: true,
      posts: result.posts || [],
      hasMore: result.hasMore || false,
      nextCursor: result.nextCursor,
      count: result.posts?.length || 0,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${ROUTE}] Request failed after ${duration}ms`, {
      requestId: ctx.requestId,
      url,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      timestamp: new Date().toISOString()
    });
    return ctx.handleError(error);
  }
}

