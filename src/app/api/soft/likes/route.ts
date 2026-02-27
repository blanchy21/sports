import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { touchLastActive } from '@/lib/api/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/likes';

// Threshold for showing "popular post" upgrade prompt
const POPULAR_POST_THRESHOLD = 10;

// ============================================
// Types
// ============================================

export interface SoftLike {
  id: string; // composite: userId_targetType_targetId
  userId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  createdAt: string;
}

// ============================================
// Validation Schemas
// ============================================

const getLikesSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.string().min(1),
});

const toggleLikeSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.string().min(1),
});

// ============================================
// GET /api/soft/likes - Get like status and count
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getLikesSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { targetType, targetId } = parseResult.data;

    // Run count query and user auth/like-check in parallel
    const [likeCount, user] = await Promise.all([
      prisma.like.count({ where: { targetType, targetId } }),
      getAuthenticatedUserFromSession(request),
    ]);

    // Check if current user has liked (if authenticated)
    let hasLiked = false;
    if (user) {
      const existing = await prisma.like.findUnique({
        where: { userId_targetType_targetId: { userId: user.userId, targetType, targetId } },
      });
      hasLiked = !!existing;
    }

    return NextResponse.json({
      success: true,
      likeCount,
      hasLiked,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/likes - Toggle like (add or remove)
// ============================================

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request);
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = toggleLikeSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { targetType, targetId } = parseResult.data;

      // Rate limiting check
      const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.softLikes, 'softLikes');
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'You are liking too frequently. Please slow down.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softLikes.limit
            ),
          }
        );
      }

      // Check if user already liked this target
      const existingLike = await prisma.like.findUnique({
        where: { userId_targetType_targetId: { userId: user.userId, targetType, targetId } },
      });

      let liked: boolean;
      const now = new Date();

      if (existingLike) {
        // Unlike - remove the like and update count in parallel
        await Promise.all([
          prisma.like.delete({ where: { id: existingLike.id } }),
          updateTargetLikeCount(targetType, targetId, -1),
        ]);
        liked = false;
      } else {
        // Like - add the like
        await prisma.like.create({
          data: {
            userId: user.userId,
            targetType,
            targetId,
            createdAt: now,
          },
        });
        liked = true;

        // Run count update and notification in parallel
        await Promise.all([
          updateTargetLikeCount(targetType, targetId, 1),
          createLikeNotification(user, targetType, targetId, now),
        ]);
      }

      touchLastActive(user.userId, ROUTE);

      // Read the actual count AFTER the atomic increment to avoid TOCTOU drift
      const newLikeCount = await prisma.like.count({ where: { targetType, targetId } });

      // Check if post just crossed the popularity threshold (fire-and-forget)
      if (liked && targetType === 'post' && newLikeCount === POPULAR_POST_THRESHOLD) {
        createPopularPostNotification(targetType, targetId, newLikeCount, now);
      }

      return NextResponse.json({
        success: true,
        liked,
        likeCount: newLikeCount,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// PUT /api/soft/likes - Batch check multiple likes at once
// ============================================

const batchCheckSchema = z.object({
  targets: z
    .array(
      z.object({
        targetType: z.enum(['post', 'comment']),
        targetId: z.string().min(1),
      })
    )
    .min(1)
    .max(50),
});

export async function PUT(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const body = await request.json();
    const parseResult = batchCheckSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { targets } = parseResult.data;
    const user = await getAuthenticatedUserFromSession(request);

    // Build OR conditions for batch query
    const orConditions = targets.map(({ targetType, targetId }) => ({ targetType, targetId }));

    // Run count aggregation and user like check in parallel (2 queries instead of 2N)
    const [countGroups, userLikes] = await Promise.all([
      prisma.like.groupBy({
        by: ['targetType', 'targetId'],
        where: { OR: orConditions },
        _count: true,
      }),
      user
        ? prisma.like.findMany({
            where: { userId: user.userId, OR: orConditions },
            select: { targetType: true, targetId: true },
          })
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const countMap = new Map<string, number>();
    for (const group of countGroups) {
      countMap.set(`${group.targetType}:${group.targetId}`, group._count);
    }

    const likedSet = new Set<string>();
    for (const like of userLikes) {
      likedSet.add(`${like.targetType}:${like.targetId}`);
    }

    // Assemble results
    const results: Record<string, { likeCount: number; hasLiked: boolean }> = {};
    for (const { targetType, targetId } of targets) {
      const key = `${targetType}:${targetId}`;
      results[key] = {
        likeCount: countMap.get(key) || 0,
        hasLiked: likedSet.has(key),
      };
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// Helper: Update like count on target document
// ============================================

async function updateTargetLikeCount(
  targetType: 'post' | 'comment',
  targetId: string,
  delta: number
) {
  try {
    const actualId = targetId.replace('soft-', '');
    if (targetType === 'post') {
      await prisma.post.update({
        where: { id: actualId },
        data: { likeCount: { increment: delta } },
      });
    } else {
      await prisma.comment.update({
        where: { id: actualId },
        data: { likeCount: { increment: delta } },
      });
    }
  } catch (error) {
    // Log but don't fail the like operation
    console.error('Failed to update like count:', error);
  }
}

// ============================================
// Helper: Create notification for like
// ============================================

async function createLikeNotification(
  user: { userId: string; username: string },
  targetType: 'post' | 'comment',
  targetId: string,
  now: Date
) {
  try {
    const actualId = targetId.replace('soft-', '');
    let authorId: string | null = null;
    let postId: string | undefined;
    let postPermlink: string | undefined;

    if (targetType === 'post') {
      const post = await prisma.post.findUnique({ where: { id: actualId } });
      if (!post) return;
      authorId = post.authorId;
      postId = targetId;
      postPermlink = post.permlink;
    } else {
      const comment = await prisma.comment.findUnique({ where: { id: actualId } });
      if (!comment) return;
      authorId = comment.authorId;
      postId = comment.postId;
      postPermlink = comment.postPermlink;
    }

    // Don't notify yourself
    if (!authorId || authorId === user.userId) return;

    await prisma.notification.create({
      data: {
        recipientId: authorId,
        type: 'like',
        title: 'New Like',
        message:
          targetType === 'post'
            ? `${user.username} liked your post`
            : `${user.username} liked your comment`,
        sourceUserId: user.userId,
        sourceUsername: user.username,
        data: {
          targetType,
          targetId,
          postId,
          postPermlink,
        },
        read: false,
        createdAt: now,
      },
    });
  } catch (error) {
    // Log but don't fail the like operation
    console.error('Failed to create like notification:', error);
  }
}

// ============================================
// Helper: Create notification for popular post milestone
// ============================================

async function createPopularPostNotification(
  targetType: 'post' | 'comment',
  targetId: string,
  likeCount: number,
  now: Date
) {
  try {
    const actualId = targetId.replace('soft-', '');
    const post =
      targetType === 'post' ? await prisma.post.findUnique({ where: { id: actualId } }) : null;

    if (!post) return;

    const authorId = post.authorId;
    if (!authorId) return;

    // Check if we already sent a popular post notification for this post
    const existingNotification = await prisma.notification.findFirst({
      where: {
        recipientId: authorId,
        type: 'system',
        data: {
          path: ['targetId'],
          equals: targetId,
        },
      },
    });

    // Check for the milestone field in the existing notification
    if (existingNotification) {
      const existingData = existingNotification.data as Record<string, unknown> | null;
      if (existingData?.milestone === 'popular') {
        return;
      }
    }

    await prisma.notification.create({
      data: {
        recipientId: authorId,
        type: 'system',
        title: 'Your post is trending!',
        message: `Your post has reached ${likeCount}+ likes! Connect to Hive to start earning rewards.`,
        data: {
          targetType,
          targetId,
          postId: targetId,
          postPermlink: post.permlink,
          milestone: 'popular',
          likeCount,
        },
        read: false,
        createdAt: now,
      },
    });
  } catch (error) {
    // Log but don't fail the like operation
    console.error('Failed to create popular post notification:', error);
  }
}
