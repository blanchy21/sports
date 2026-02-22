import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  createRequestContext,
  validationError,
  unauthorizedError,
  forbiddenError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/posts';

// Soft user post limits
const FREE_POST_LIMIT = 50;
const WARNING_THRESHOLD = 40;

// ============================================
// Validation Schemas
// ============================================

const getPostsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  authorId: z.string().min(1).optional(),
  communityId: z.string().min(1).optional(),
});

const createPostSchema = z.object({
  // Auth - user must provide their ID
  authorId: z.string().min(1, 'Author ID is required'),
  authorUsername: z.string().min(1, 'Author username is required').max(50, 'Username too long'),
  authorDisplayName: z.string().max(100, 'Display name too long').optional(),
  authorAvatar: z.string().url('Invalid avatar URL').optional().nullable(),

  // Content
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .transform((val) => val.trim()),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content too long')
    .transform((val) => val.trim()),

  // Metadata
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(50, 'Tag too long')
        .regex(/^[a-z0-9-]+$/, 'Tags must be lowercase alphanumeric with hyphens')
    )
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  sportCategory: z.string().max(50, 'Category too long').optional(),
  featuredImage: z.string().url('Invalid featured image URL').optional().nullable(),

  // Community association
  communityId: z.string().min(1).optional(),
  communitySlug: z.string().min(1).max(100).optional(),
  communityName: z.string().min(1).max(100).optional(),
});

// Type is inferred from schema validation

/**
 * GET /api/posts - Fetch soft posts (non-Hive posts stored in database)
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - authorId: string (filter by author)
 * - communityId: string (filter by community)
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getPostsQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { limit, authorId, communityId } = parseResult.data;

    ctx.log.debug('Fetching posts', { limit, authorId, communityId });

    const where: Record<string, unknown> = {};
    if (authorId) where.authorId = authorId;
    if (communityId) where.communityId = communityId;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * POST /api/posts - Create a new soft post (for non-Hive users)
 *
 * Requires authenticated user. The authorId must match the authenticated user.
 */
export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      // Parse JSON body with error handling
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return validationError('Invalid JSON body', ctx.requestId);
      }

      // Validate request body
      const parseResult = createPostSchema.safeParse(body);
      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const data = parseResult.data;

      // Authorization check: Verify user identity from session cookie
      const sessionUser = await getAuthenticatedUserFromSession(request);

      if (!sessionUser) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const authenticatedUserId = sessionUser.userId;

      // Verify the authenticated user matches the author
      if (authenticatedUserId !== data.authorId) {
        ctx.log.warn('Authorization failed: user ID mismatch', {
          authenticatedUserId,
          requestedAuthorId: data.authorId,
        });
        return forbiddenError('You can only create posts as yourself', ctx.requestId);
      }

      // Rate limiting check
      const rateLimit = await checkRateLimit(
        authenticatedUserId,
        RATE_LIMITS.softPosts,
        'softPosts'
      );
      if (!rateLimit.success) {
        ctx.log.warn('Rate limit exceeded', {
          authorId: authenticatedUserId,
          remaining: rateLimit.remaining,
          reset: new Date(rateLimit.reset).toISOString(),
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'You are posting too frequently. Please wait before creating another post.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softPosts.limit
            ),
          }
        );
      }

      // Generate a unique permlink
      const permlink = `${data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50)}-${Date.now()}`;

      // Generate excerpt from content (first 200 chars, strip markdown)
      const excerpt =
        data.content
          .replace(/[#*_`~\[\]()>]/g, '')
          .substring(0, 200)
          .trim() + (data.content.length > 200 ? '...' : '');

      // Atomic check-and-write: count + create inside a transaction to prevent TOCTOU race
      let currentPostCount: number;
      let post: { id: string };

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Count existing posts inside transaction
          const count = await tx.post.count({
            where: { authorId: data.authorId },
          });

          if (count >= FREE_POST_LIMIT) {
            throw Object.assign(new Error('POST_LIMIT_REACHED'), { postCount: count });
          }

          // Create the new post inside the same transaction
          const newPost = await tx.post.create({
            data: {
              authorId: data.authorId,
              authorUsername: data.authorUsername,
              authorDisplayName: data.authorDisplayName || data.authorUsername,
              authorAvatar: data.authorAvatar || null,
              title: data.title,
              content: data.content,
              excerpt,
              permlink,
              tags: data.tags || [],
              sportCategory: data.sportCategory || null,
              featuredImage: data.featuredImage || null,
              communityId: data.communityId || null,
              communitySlug: data.communitySlug || null,
              communityName: data.communityName || null,
              isPublishedToHive: false,
              hivePermlink: null,
              viewCount: 0,
              likeCount: 0,
            },
          });

          return { count, post: newPost };
        });

        currentPostCount = result.count;
        post = result.post;
      } catch (txError: unknown) {
        if (txError instanceof Error && txError.message === 'POST_LIMIT_REACHED') {
          const count = (txError as Error & { postCount: number }).postCount;
          ctx.log.warn('Post limit reached', {
            authorId: data.authorId,
            currentCount: count,
            limit: FREE_POST_LIMIT,
          });
          return NextResponse.json(
            {
              success: false,
              error: 'Post limit reached',
              message: `You've reached the limit of ${FREE_POST_LIMIT} posts. Upgrade to Hive for unlimited posts and earn rewards!`,
              limitReached: true,
              currentCount: count,
              limit: FREE_POST_LIMIT,
            },
            { status: 403 }
          );
        }
        throw txError;
      }

      // Calculate remaining posts and warning state
      const remainingPosts = FREE_POST_LIMIT - currentPostCount - 1;
      const isNearLimit = currentPostCount >= WARNING_THRESHOLD;

      ctx.log.info('Creating post', {
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        title: data.title.substring(0, 50),
        communityId: data.communityId,
      });

      // Update user's lastActiveAt timestamp (fire-and-forget)
      prisma.profile
        .update({
          where: { id: data.authorId },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});

      // Increment community post count (fire-and-forget)
      if (data.communityId) {
        prisma.community
          .update({
            where: { id: data.communityId },
            data: { postCount: { increment: 1 } },
          })
          .catch((err: unknown) => {
            ctx.log.warn('Failed to increment community post count', {
              communityId: data.communityId,
              error: err,
            });
          });
      }

      ctx.log.info('Post created successfully', { postId: post.id });

      return NextResponse.json(
        {
          success: true,
          post,
          message: 'Post created successfully',
          postLimitInfo: {
            currentCount: currentPostCount + 1,
            limit: FREE_POST_LIMIT,
            remaining: remainingPosts,
            isNearLimit,
            upgradePrompt: isNearLimit
              ? `You have ${remainingPosts} post${remainingPosts === 1 ? '' : 's'} remaining. Upgrade to Hive for unlimited posts!`
              : null,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
