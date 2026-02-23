import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/db/prisma';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';

// Lazy-init Redis for view dedup (same pattern as rate-limit.ts)
let viewRedis: Redis | null = null;

function getViewRedis(): Redis | null {
  if (viewRedis) return viewRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    viewRedis = new Redis({ url, token });
    return viewRedis;
  } catch {
    return null;
  }
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/posts/[id] - Get a single soft post by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Deduplicated view count increment (fire and forget)
    const ip =
      request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${ip}:${ua}`)
      .digest('hex')
      .slice(0, 16);
    const viewKey = `view:${id}:${fingerprint}`;

    const redis = getViewRedis();
    if (redis) {
      redis
        .set(viewKey, '1', { ex: 3600, nx: true })
        .then((wasSet) => {
          if (wasSet) {
            return prisma.post.update({
              where: { id },
              data: { viewCount: { increment: 1 } },
            });
          }
        })
        .catch((err: unknown) => {
          console.error(
            'Failed to increment view count:',
            err instanceof Error ? err.message : err
          );
        });
    } else {
      // Redis unavailable — increment anyway (graceful fallback)
      prisma.post
        .update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        })
        .catch((err: unknown) => {
          console.error(
            'Failed to increment view count:',
            err instanceof Error ? err.message : err
          );
        });
    }

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch post',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/posts/[id] - Update a soft post
 *
 * Requires authenticated session. User must own the post.
 *
 * Body:
 * - title: string (optional)
 * - content: string (optional)
 * - tags: string[] (optional)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  // CSRF protection
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Rate limiting
  const patchClientId = getClientIdentifier(request);
  const patchRateLimit = await checkRateLimit(patchClientId, RATE_LIMITS.write, 'write');
  if (!patchRateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: createRateLimitHeaders(0, patchRateLimit.reset, RATE_LIMITS.write.limit),
      }
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    // Verify user identity from session cookie
    const sessionUser = await getAuthenticatedUserFromSession(request);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if post exists
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Verify the authenticated user owns this post
    if (existingPost.authorId !== sessionUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this post' },
        { status: 403 }
      );
    }

    // Build updates object
    const updates: Partial<{ title: string; content: string; tags: string[] }> = {};

    if (body.title !== undefined) {
      if (body.title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updates.title = body.title.trim();
    }

    if (body.content !== undefined) {
      if (body.content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Content cannot be empty' },
          { status: 400 }
        );
      }
      updates.content = body.content.trim();
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json(
          { success: false, error: 'Tags must be an array' },
          { status: 400 }
        );
      }
      if (body.tags.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Maximum 10 tags allowed' },
          { status: 400 }
        );
      }
      const invalidTag = body.tags.find(
        (t: unknown) => typeof t !== 'string' || t.length > 50 || !/^[a-z0-9-]+$/.test(t)
      );
      if (invalidTag !== undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tags must be lowercase alphanumeric with hyphens, max 50 chars',
          },
          { status: 400 }
        );
      }
      updates.tags = body.tags;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update post',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id] - Delete a soft post
 *
 * Requires authenticated session. User must own the post.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  // CSRF protection
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Rate limiting
  const deleteClientId = getClientIdentifier(request);
  const deleteRateLimit = await checkRateLimit(deleteClientId, RATE_LIMITS.write, 'write');
  if (!deleteRateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: createRateLimitHeaders(0, deleteRateLimit.reset, RATE_LIMITS.write.limit),
      }
    );
  }

  try {
    const { id } = await context.params;

    // Verify user identity from session cookie
    const sessionUser = await getAuthenticatedUserFromSession(request);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if post exists
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Verify the authenticated user owns this post
    if (existingPost.authorId !== sessionUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this post' },
        { status: 403 }
      );
    }

    await prisma.post.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete post',
      },
      { status: 500 }
    );
  }
}
