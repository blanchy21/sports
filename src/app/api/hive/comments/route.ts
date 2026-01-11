import { NextRequest, NextResponse } from 'next/server';
import { fetchComments } from '@/lib/hive-workerbee/content';
import { getUserComments } from '@/lib/hive-workerbee/comments';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { commentsQuerySchema, parseSearchParams } from '@/lib/api/validation';
import { createRequestContext, validationError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/comments';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  // Validate query parameters
  const parseResult = parseSearchParams(request.nextUrl.searchParams, commentsQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { author, permlink, username, limit } = parseResult.data;

  try {
    // Fetch comments for a specific post
    if (author && permlink) {
      ctx.log.debug('Fetching post comments', { author, permlink });

      const comments = await retryWithBackoff(
        () => fetchComments(author, permlink),
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        comments: comments || [],
        count: comments?.length || 0,
      });
    }

    // Fetch user's comments (username is guaranteed by schema refinement)
    ctx.log.debug('Fetching user comments', { username, limit });

    const comments = await retryWithBackoff(
      () => getUserComments(username!, limit),
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );

    return NextResponse.json({
      success: true,
      comments: comments || [],
      count: comments?.length || 0,
      username,
    });

  } catch (error) {
    return ctx.handleError(error);
  }
}

