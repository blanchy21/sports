import { NextRequest, NextResponse } from 'next/server';
import { FirebasePosts } from '@/lib/firebase/posts';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/posts/[id]/like - Like a soft post
 *
 * Note: This is a simple increment without tracking who liked.
 * For production, you'd want to track user likes to prevent duplicates.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  // CSRF protection
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.softLikes, 'softLikes');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: createRateLimitHeaders(0, rateLimit.reset, RATE_LIMITS.softLikes.limit),
      }
    );
  }

  try {
    const { id } = await context.params;

    // Check if post exists
    const post = await FirebasePosts.getPostById(id);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    await FirebasePosts.incrementLikeCount(id);

    return NextResponse.json({
      success: true,
      message: 'Post liked',
      likeCount: (post.likeCount || 0) + 1,
    });
  } catch (error) {
    console.error('Error liking post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like post',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/like - Unlike a soft post
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  // CSRF protection
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.softLikes, 'softLikes');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: createRateLimitHeaders(0, rateLimit.reset, RATE_LIMITS.softLikes.limit),
      }
    );
  }

  try {
    const { id } = await context.params;

    // Check if post exists
    const post = await FirebasePosts.getPostById(id);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    await FirebasePosts.decrementLikeCount(id);

    return NextResponse.json({
      success: true,
      message: 'Post unliked',
      likeCount: Math.max(0, (post.likeCount || 0) - 1),
    });
  } catch (error) {
    console.error('Error unliking post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlike post',
      },
      { status: 500 }
    );
  }
}
