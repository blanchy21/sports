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
import { createApiHandler } from '@/lib/api/response';
import { extractPathParam } from '@/lib/api/route-params';
import { logger } from '@/lib/logger';

const ROUTE = '/api/posts/[id]';

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

/** Extract post ID from URL path: /api/posts/{id} */
function extractPostId(request: Request): string {
  return extractPathParam(request.url, 'posts') ?? '';
}

/**
 * GET /api/posts/[id] - Get a single soft post by ID
 */
export const GET = createApiHandler(ROUTE, async (request) => {
  const id = extractPostId(request);

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
  const fingerprint = crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 16);
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
        logger.error('Failed to increment view count', 'posts-by-id', err);
      });
  } else {
    // Redis unavailable — increment anyway (graceful fallback)
    prisma.post
      .update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err: unknown) => {
        logger.error('Failed to increment view count', 'posts-by-id', err);
      });
  }

  return NextResponse.json(
    {
      success: true,
      post,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
});

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
export const PATCH = createApiHandler(ROUTE, async (request) => {
  // CSRF protection
  if (!validateCsrf(request as NextRequest)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Rate limiting
  const patchClientId = getClientIdentifier(request as NextRequest);
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

  const id = extractPostId(request);
  const body = await request.json();

  // Verify user identity from session cookie
  const sessionUser = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
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
      return NextResponse.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Tags must be an array' }, { status: 400 });
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
});

/**
 * DELETE /api/posts/[id] - Delete a soft post
 *
 * Requires authenticated session. User must own the post.
 */
export const DELETE = createApiHandler(ROUTE, async (request) => {
  // CSRF protection
  if (!validateCsrf(request as NextRequest)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Rate limiting
  const deleteClientId = getClientIdentifier(request as NextRequest);
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

  const id = extractPostId(request);

  // Verify user identity from session cookie
  const sessionUser = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
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
});
