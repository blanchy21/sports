import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/follows';

// ============================================
// Types
// ============================================

export interface SoftFollow {
  id: string; // composite: followerId_followedId
  followerId: string;
  followerUsername: string;
  followedId: string;
  followedUsername: string;
  createdAt: string;
}

export interface FollowStats {
  followerCount: number;
  followingCount: number;
}

// ============================================
// Validation Schemas
// ============================================

const getFollowsSchema = z.object({
  userId: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  type: z.enum(['followers', 'following']).optional().default('followers'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
});

const toggleFollowSchema = z.object({
  targetUserId: z.string().min(1),
  targetUsername: z.string().min(1),
});

const checkFollowSchema = z.object({
  targetUserId: z.string().min(1),
});

// ============================================
// Helper Functions
// ============================================

async function updateFollowCounts(followerId: string, followedId: string, delta: number) {
  try {
    // Update both counts in parallel using atomic increment
    await Promise.all([
      prisma.profile.update({
        where: { id: followerId },
        data: { followingCount: { increment: delta } },
      }),
      prisma.profile.update({
        where: { id: followedId },
        data: { followerCount: { increment: delta } },
      }),
    ]);
  } catch (error) {
    console.error('Failed to update follow counts:', error);
  }
}

// ============================================
// GET /api/soft/follows - Get followers or following list
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getFollowsSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { userId, username, type, limit, offset } = parseResult.data;

    if (!userId && !username) {
      return validationError('Either userId or username is required', ctx.requestId);
    }

    // Resolve userId from username if needed
    let targetUserId = userId;
    if (!targetUserId && username) {
      const profile = await prisma.profile.findUnique({ where: { username } });
      if (!profile) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      targetUserId = profile.id;
    }

    // Get the current user to check if they follow these users
    const currentUser = await getAuthenticatedUserFromSession(request);

    // Build query based on type
    const whereClause =
      type === 'followers' ? { followedId: targetUserId } : { followerId: targetUserId };

    // Run data query and count query in parallel
    const [rows, totalCount] = await Promise.all([
      prisma.follow.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.follow.count({ where: whereClause }),
    ]);

    // Collect related user IDs and batch-check follow status
    const relatedUsers = rows.map((row) => ({
      docId: row.id,
      userId: type === 'followers' ? row.followerId : row.followedId,
      username: type === 'followers' ? row.followerUsername : row.followedUsername,
      createdAt: row.createdAt.toISOString(),
    }));

    // Batch follow-check
    const followStatusMap = new Map<string, boolean>();
    if (currentUser) {
      const userIdsToCheck = relatedUsers
        .filter((u) => u.userId !== currentUser.userId)
        .map((u) => u.userId);

      if (userIdsToCheck.length > 0) {
        const existingFollows = await prisma.follow.findMany({
          where: { followerId: currentUser.userId, followedId: { in: userIdsToCheck } },
          select: { followedId: true },
        });
        const followedSet = new Set(existingFollows.map((f) => f.followedId));
        userIdsToCheck.forEach((uid) => {
          followStatusMap.set(uid, followedSet.has(uid));
        });
      }
    }

    const follows = relatedUsers.map((u) => ({
      id: u.docId,
      userId: u.userId,
      username: u.username,
      createdAt: u.createdAt,
      isFollowing: followStatusMap.get(u.userId) ?? false,
    }));

    return NextResponse.json({
      success: true,
      type,
      users: follows,
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore: offset + follows.length < totalCount,
      },
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/follows - Toggle follow (follow or unfollow)
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
      const parseResult = toggleFollowSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { targetUserId, targetUsername } = parseResult.data;

      // Can't follow yourself
      if (user.userId === targetUserId) {
        return NextResponse.json(
          { success: false, error: 'You cannot follow yourself' },
          { status: 400 }
        );
      }

      // Validate target user exists to prevent phantom follows
      const targetProfile = await prisma.profile.findUnique({ where: { id: targetUserId } });
      if (!targetProfile) {
        return NextResponse.json(
          { success: false, error: 'Target user not found' },
          { status: 404 }
        );
      }

      // Rate limiting check
      const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.softFollows, 'softFollows');
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'You are following too frequently. Please slow down.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softFollows.limit
            ),
          }
        );
      }

      const existingFollow = await prisma.follow.findUnique({
        where: { followerId_followedId: { followerId: user.userId, followedId: targetUserId } },
      });

      let isFollowing: boolean;
      const now = new Date();

      if (existingFollow) {
        // Unfollow
        await prisma.follow.delete({ where: { id: existingFollow.id } });
        isFollowing = false;
        await updateFollowCounts(user.userId, targetUserId, -1);
      } else {
        // Follow
        await prisma.follow.create({
          data: {
            followerId: user.userId,
            followerUsername: user.username,
            followedId: targetUserId,
            followedUsername: targetUsername,
            createdAt: now,
          },
        });
        isFollowing = true;
        await updateFollowCounts(user.userId, targetUserId, 1);

        // Create notification for the followed user
        await prisma.notification.create({
          data: {
            recipientId: targetUserId,
            type: 'follow',
            title: 'New Follower',
            message: `${user.username} started following you`,
            sourceUserId: user.userId,
            sourceUsername: user.username,
            data: {},
            read: false,
            createdAt: now,
          },
        });
      }

      // Update user's lastActiveAt timestamp (fire-and-forget)
      prisma.profile
        .update({
          where: { id: user.userId },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});

      // Get updated follower count for target user
      const followerCount = await prisma.follow.count({
        where: { followedId: targetUserId },
      });

      return NextResponse.json({
        success: true,
        isFollowing,
        followerCount,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// PUT /api/soft/follows - Check follow status
// ============================================

export async function PUT(request: NextRequest) {
  // Rate limiting
  const putClientId = getClientIdentifier(request);
  const putRateLimit = await checkRateLimit(putClientId, RATE_LIMITS.read, 'followsRead');
  if (!putRateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: createRateLimitHeaders(0, putRateLimit.reset, RATE_LIMITS.read.limit),
      }
    );
  }

  const ctx = createRequestContext(ROUTE);

  try {
    const user = await getAuthenticatedUserFromSession(request);

    const body = await request.json();
    const parseResult = checkFollowSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { targetUserId } = parseResult.data;

    // Run follow-check and both count queries in parallel
    const followCheckPromise =
      user && user.userId !== targetUserId
        ? prisma.follow.findUnique({
            where: { followerId_followedId: { followerId: user.userId, followedId: targetUserId } },
          })
        : Promise.resolve(null);

    const [followDoc, followerCount, followingCount] = await Promise.all([
      followCheckPromise,
      prisma.follow.count({ where: { followedId: targetUserId } }),
      prisma.follow.count({ where: { followerId: targetUserId } }),
    ]);

    const isFollowing = !!followDoc;

    return NextResponse.json({
      success: true,
      isFollowing,
      stats: {
        followerCount,
        followingCount,
      },
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
