import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { updateUserLastActiveAt } from '@/lib/firebase/profiles';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { FieldValue, Firestore } from 'firebase-admin/firestore';

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

function createFollowId(followerId: string, followedId: string): string {
  return `${followerId}_${followedId}`;
}

async function updateFollowCounts(
  db: Firestore,
  followerId: string,
  followedId: string,
  delta: number
) {
  try {
    const followerProfileRef = db.collection('profiles').doc(followerId);
    const followedProfileRef = db.collection('profiles').doc(followedId);

    // Update both counts in parallel using atomic increment
    await Promise.all([
      followerProfileRef.update({
        followingCount: FieldValue.increment(delta),
      }),
      followedProfileRef.update({
        followerCount: FieldValue.increment(delta),
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

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Resolve userId from username if needed
    let targetUserId = userId;
    if (!targetUserId && username) {
      const profileSnapshot = await db
        .collection('profiles')
        .where('username', '==', username)
        .limit(1)
        .get();
      if (profileSnapshot.empty) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      targetUserId = profileSnapshot.docs[0].id;
    }

    // Get the current user to check if they follow these users
    const currentUser = await getAuthenticatedUserFromSession(request);

    // Build query based on type
    const fieldToQuery = type === 'followers' ? 'followedId' : 'followerId';

    // Run data query and count query in parallel
    const [snapshot, countSnapshot] = await Promise.all([
      db
        .collection('soft_follows')
        .where(fieldToQuery, '==', targetUserId)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit)
        .get(),
      db.collection('soft_follows').where(fieldToQuery, '==', targetUserId).count().get(),
    ]);

    // Collect related user IDs and batch-check follow status
    const relatedUsers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        docId: doc.id,
        userId: type === 'followers' ? data.followerId : data.followedId,
        username: type === 'followers' ? data.followerUsername : data.followedUsername,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
    });

    // Batch follow-check: build all follow doc refs and fetch in one call
    const followStatusMap = new Map<string, boolean>();
    if (currentUser) {
      const userIdsToCheck = relatedUsers
        .filter((u) => u.userId !== currentUser.userId)
        .map((u) => u.userId);

      if (userIdsToCheck.length > 0) {
        const followRefs = userIdsToCheck.map((uid) =>
          db.collection('soft_follows').doc(createFollowId(currentUser.userId, uid))
        );
        const followDocs = await db.getAll(...followRefs);
        userIdsToCheck.forEach((uid, i) => {
          followStatusMap.set(uid, followDocs[i].exists);
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
        total: countSnapshot.data().count,
        offset,
        limit,
        hasMore: offset + follows.length < countSnapshot.data().count,
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

      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      // Validate target user exists to prevent phantom follows
      const targetProfile = await db.collection('profiles').doc(targetUserId).get();
      if (!targetProfile.exists) {
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

      const followId = createFollowId(user.userId, targetUserId);
      const followRef = db.collection('soft_follows').doc(followId);
      const followDoc = await followRef.get();

      let isFollowing: boolean;
      const now = new Date();

      if (followDoc.exists) {
        // Unfollow
        await followRef.delete();
        isFollowing = false;
        await updateFollowCounts(db, user.userId, targetUserId, -1);
      } else {
        // Follow
        await followRef.set({
          followerId: user.userId,
          followerUsername: user.username,
          followedId: targetUserId,
          followedUsername: targetUsername,
          createdAt: now,
        });
        isFollowing = true;
        await updateFollowCounts(db, user.userId, targetUserId, 1);

        // Create notification for the followed user
        await db.collection('soft_notifications').add({
          recipientId: targetUserId,
          type: 'follow',
          title: 'New Follower',
          message: `${user.username} started following you`,
          sourceUserId: user.userId,
          sourceUsername: user.username,
          data: {},
          read: false,
          createdAt: now,
        });
      }

      // Update user's lastActiveAt timestamp (fire-and-forget)
      updateUserLastActiveAt(user.userId).catch(() => {});

      // Get updated follower count for target user
      const followerCountSnapshot = await db
        .collection('soft_follows')
        .where('followedId', '==', targetUserId)
        .count()
        .get();

      return NextResponse.json({
        success: true,
        isFollowing,
        followerCount: followerCountSnapshot.data().count,
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

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Run follow-check and both count queries in parallel
    const followCheckPromise =
      user && user.userId !== targetUserId
        ? db.collection('soft_follows').doc(createFollowId(user.userId, targetUserId)).get()
        : Promise.resolve(null);

    const [followDoc, followerCountSnapshot, followingCountSnapshot] = await Promise.all([
      followCheckPromise,
      db.collection('soft_follows').where('followedId', '==', targetUserId).count().get(),
      db.collection('soft_follows').where('followerId', '==', targetUserId).count().get(),
    ]);

    const isFollowing = followDoc ? followDoc.exists : false;

    return NextResponse.json({
      success: true,
      isFollowing,
      stats: {
        followerCount: followerCountSnapshot.data().count,
        followingCount: followingCountSnapshot.data().count,
      },
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
