import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { updateUserLastActiveAt } from '@/lib/firebase/profiles';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/api/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { FieldValue, Firestore } from 'firebase-admin/firestore';

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
// Helper Functions
// ============================================

function createLikeId(userId: string, targetType: string, targetId: string): string {
  return `${userId}_${targetType}_${targetId}`;
}

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

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Run count query and user auth/like-check in parallel
    const [likesSnapshot, user] = await Promise.all([
      db
        .collection('soft_likes')
        .where('targetType', '==', targetType)
        .where('targetId', '==', targetId)
        .count()
        .get(),
      getAuthenticatedUserFromSession(request),
    ]);

    const likeCount = likesSnapshot.data().count;

    // Check if current user has liked (if authenticated)
    let hasLiked = false;
    if (user) {
      const likeId = createLikeId(user.userId, targetType, targetId);
      const likeDoc = await db.collection('soft_likes').doc(likeId).get();
      hasLiked = likeDoc.exists;
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
      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      // Rate limiting check
      const rateLimit = checkRateLimit(user.userId, RATE_LIMITS.likes);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'You are liking too frequently. Please slow down.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimit),
          }
        );
      }

      const likeId = createLikeId(user.userId, targetType, targetId);
      const likeRef = db.collection('soft_likes').doc(likeId);

      // Fetch existing like and current count in parallel
      const [likeDoc, countSnapshot] = await Promise.all([
        likeRef.get(),
        db
          .collection('soft_likes')
          .where('targetType', '==', targetType)
          .where('targetId', '==', targetId)
          .count()
          .get(),
      ]);

      const currentCount = countSnapshot.data().count;
      let liked: boolean;
      const now = new Date();

      if (likeDoc.exists) {
        // Unlike - remove the like and update count in parallel
        await Promise.all([likeRef.delete(), updateTargetLikeCount(db, targetType, targetId, -1)]);
        liked = false;
      } else {
        // Like - add the like, update count, and notify in parallel
        await likeRef.set({
          userId: user.userId,
          targetType,
          targetId,
          createdAt: now,
        });
        liked = true;

        // Run count update and notification in parallel
        await Promise.all([
          updateTargetLikeCount(db, targetType, targetId, 1),
          createLikeNotification(db, user, targetType, targetId, now),
        ]);
      }

      // Fire-and-forget: lastActiveAt update
      updateUserLastActiveAt(user.userId);

      // Compute new count from pre-toggle count instead of re-querying
      const newLikeCount = currentCount + (liked ? 1 : -1);

      // Check if post just crossed the popularity threshold (fire-and-forget)
      if (liked && targetType === 'post' && newLikeCount === POPULAR_POST_THRESHOLD) {
        createPopularPostNotification(db, targetType, targetId, newLikeCount, now);
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
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const results: Record<string, { likeCount: number; hasLiked: boolean }> = {};

    // Process in parallel for better performance
    await Promise.all(
      targets.map(async ({ targetType, targetId }) => {
        const key = `${targetType}:${targetId}`;

        // Get like count
        const likesSnapshot = await db
          .collection('soft_likes')
          .where('targetType', '==', targetType)
          .where('targetId', '==', targetId)
          .count()
          .get();

        const likeCount = likesSnapshot.data().count;

        // Check if user has liked
        let hasLiked = false;
        if (user) {
          const likeId = createLikeId(user.userId, targetType, targetId);
          const likeDoc = await db.collection('soft_likes').doc(likeId).get();
          hasLiked = likeDoc.exists;
        }

        results[key] = { likeCount, hasLiked };
      })
    );

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
  db: Firestore,
  targetType: 'post' | 'comment',
  targetId: string,
  delta: number
) {
  try {
    const collection = targetType === 'post' ? 'soft_posts' : 'soft_comments';
    // Handle IDs that might have 'soft-' prefix
    const actualId = targetId.replace('soft-', '');
    const docRef = db.collection(collection).doc(actualId);
    await docRef.update({
      likeCount: FieldValue.increment(delta),
    });
  } catch (error) {
    // Log but don't fail the like operation
    console.error('Failed to update like count:', error);
  }
}

// ============================================
// Helper: Create notification for like
// ============================================

async function createLikeNotification(
  db: Firestore,
  user: { userId: string; username: string },
  targetType: 'post' | 'comment',
  targetId: string,
  now: Date
) {
  try {
    const collection = targetType === 'post' ? 'soft_posts' : 'soft_comments';
    const actualId = targetId.replace('soft-', '');
    const docRef = db.collection(collection).doc(actualId);
    const doc = await docRef.get();

    if (!doc.exists) return;

    const data = doc.data();
    const authorId = data?.authorId;

    // Don't notify yourself
    if (!authorId || authorId === user.userId) return;

    await db.collection('soft_notifications').add({
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
        postId: targetType === 'post' ? targetId : data?.postId,
        postPermlink: data?.postPermlink || data?.permlink,
      },
      read: false,
      createdAt: now,
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
  db: Firestore,
  targetType: 'post' | 'comment',
  targetId: string,
  likeCount: number,
  now: Date
) {
  try {
    const collection = targetType === 'post' ? 'soft_posts' : 'soft_comments';
    const actualId = targetId.replace('soft-', '');
    const docRef = db.collection(collection).doc(actualId);
    const doc = await docRef.get();

    if (!doc.exists) return;

    const data = doc.data();
    const authorId = data?.authorId;

    if (!authorId) return;

    // Check if we already sent a popular post notification for this post
    const existingNotification = await db
      .collection('soft_notifications')
      .where('recipientId', '==', authorId)
      .where('type', '==', 'system')
      .where('data.targetId', '==', targetId)
      .where('data.milestone', '==', 'popular')
      .limit(1)
      .get();

    if (!existingNotification.empty) {
      // Already sent this notification
      return;
    }

    await db.collection('soft_notifications').add({
      recipientId: authorId,
      type: 'system',
      title: 'Your post is trending!',
      message: `Your post has reached ${likeCount}+ likes! Connect to Hive to start earning rewards.`,
      data: {
        targetType,
        targetId,
        postId: targetId,
        postPermlink: data?.permlink,
        milestone: 'popular',
        likeCount,
      },
      read: false,
      createdAt: now,
    });
  } catch (error) {
    // Log but don't fail the like operation
    console.error('Failed to create popular post notification:', error);
  }
}
