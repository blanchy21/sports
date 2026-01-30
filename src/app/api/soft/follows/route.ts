import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { updateUserLastActiveAt } from '@/lib/firebase/profiles';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/api/rate-limit';
import { Firestore } from 'firebase-admin/firestore';

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

async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ userId: string; username: string } | null> {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return null;
  }

  try {
    const db = getAdminDb();
    if (!db) return null;

    const profileDoc = await db.collection('profiles').doc(userId).get();
    if (!profileDoc.exists) return null;

    const data = profileDoc.data();
    return {
      userId: profileDoc.id,
      username: data?.username ?? '',
    };
  } catch {
    return null;
  }
}

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
    // Update follower's following count
    const followerProfileRef = db.collection('profiles').doc(followerId);
    const followerProfile = await followerProfileRef.get();
    if (followerProfile.exists) {
      const currentFollowing = followerProfile.data()?.followingCount || 0;
      await followerProfileRef.update({
        followingCount: Math.max(0, currentFollowing + delta),
      });
    }

    // Update followed user's follower count
    const followedProfileRef = db.collection('profiles').doc(followedId);
    const followedProfile = await followedProfileRef.get();
    if (followedProfile.exists) {
      const currentFollowers = followedProfile.data()?.followerCount || 0;
      await followedProfileRef.update({
        followerCount: Math.max(0, currentFollowers + delta),
      });
    }
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
    const currentUser = await getAuthenticatedUser(request);

    // Build query based on type
    const fieldToQuery = type === 'followers' ? 'followedId' : 'followerId';

    const snapshot = await db
      .collection('soft_follows')
      .where(fieldToQuery, '==', targetUserId)
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit)
      .get();

    const follows: Array<{
      id: string;
      userId: string;
      username: string;
      createdAt: string;
      isFollowing?: boolean;
    }> = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const relatedUserId = type === 'followers' ? data.followerId : data.followedId;
      const relatedUsername = type === 'followers' ? data.followerUsername : data.followedUsername;

      // Check if current user follows this person
      let isFollowing = false;
      if (currentUser && currentUser.userId !== relatedUserId) {
        const followId = createFollowId(currentUser.userId, relatedUserId);
        const followDoc = await db.collection('soft_follows').doc(followId).get();
        isFollowing = followDoc.exists;
      }

      follows.push({
        id: doc.id,
        userId: relatedUserId,
        username: relatedUsername,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        isFollowing,
      });
    }

    // Get total count
    const countSnapshot = await db
      .collection('soft_follows')
      .where(fieldToQuery, '==', targetUserId)
      .count()
      .get();

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
  const ctx = createRequestContext(ROUTE);

  try {
    const user = await getAuthenticatedUser(request);
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

    // Rate limiting check
    const rateLimit = checkRateLimit(user.userId, RATE_LIMITS.follows);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'You are following too frequently. Please slow down.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
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

    // Update user's lastActiveAt timestamp
    await updateUserLastActiveAt(user.userId);

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
}

// ============================================
// PUT /api/soft/follows - Check follow status
// ============================================

export async function PUT(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const user = await getAuthenticatedUser(request);

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

    // Check if current user follows target
    let isFollowing = false;
    if (user && user.userId !== targetUserId) {
      const followId = createFollowId(user.userId, targetUserId);
      const followDoc = await db.collection('soft_follows').doc(followId).get();
      isFollowing = followDoc.exists;
    }

    // Get follower and following counts for target user
    const followerCountSnapshot = await db
      .collection('soft_follows')
      .where('followedId', '==', targetUserId)
      .count()
      .get();

    const followingCountSnapshot = await db
      .collection('soft_follows')
      .where('followerId', '==', targetUserId)
      .count()
      .get();

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
