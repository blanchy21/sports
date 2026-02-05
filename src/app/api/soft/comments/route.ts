import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updateUserLastActiveAt } from '@/lib/firebase/profiles';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/api/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/comments';

// ============================================
// Types
// ============================================

export interface SoftComment {
  id: string;
  postId: string;
  postPermlink: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  parentCommentId?: string; // For replies
  body: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isDeleted: boolean;
}

// ============================================
// Validation Schemas
// ============================================

const getCommentsSchema = z.object({
  postId: z.string().min(1).optional(),
  postPermlink: z.string().min(1).optional(),
  parentCommentId: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().min(1).max(100)),
});

const createCommentSchema = z.object({
  postId: z.string().min(1),
  postPermlink: z.string().min(1),
  parentCommentId: z.string().optional(),
  body: z.string().min(1).max(10000),
});

const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  body: z.string().min(1).max(10000),
});

const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});

// ============================================
// GET /api/soft/comments - Fetch comments for a post
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getCommentsSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { postId, postPermlink, parentCommentId, limit } = parseResult.data;

    if (!postId && !postPermlink) {
      return NextResponse.json(
        { success: false, error: 'Either postId or postPermlink is required' },
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

    let query = db.collection('soft_comments').where('isDeleted', '==', false);

    if (postId) {
      query = query.where('postId', '==', postId);
    } else if (postPermlink) {
      query = query.where('postPermlink', '==', postPermlink);
    }

    // Filter by parent for threaded comments
    if (parentCommentId === '') {
      // Top-level comments only
      query = query.where('parentCommentId', '==', null);
    } else if (parentCommentId) {
      // Replies to specific comment
      query = query.where('parentCommentId', '==', parentCommentId);
    }

    query = query.orderBy('createdAt', 'asc').limit(limit);

    const snapshot = await query.get();
    const comments: SoftComment[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        postId: data.postId,
        postPermlink: data.postPermlink,
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorDisplayName: data.authorDisplayName,
        authorAvatar: data.authorAvatar,
        parentCommentId: data.parentCommentId || undefined,
        body: data.body,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        likeCount: data.likeCount || 0,
        isDeleted: data.isDeleted || false,
      });
    });

    return NextResponse.json({
      success: true,
      comments,
      count: comments.length,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/comments - Create a new comment
// ============================================

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request, { includeProfile: true });
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = createCommentSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { postId, postPermlink, parentCommentId, body: commentBody } = parseResult.data;

      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      // Rate limiting check
      const rateLimit = checkRateLimit(user.userId, RATE_LIMITS.comments);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message:
              'You are commenting too frequently. Please wait before posting another comment.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimit),
          }
        );
      }

      // Check comment limit (200 per user)
      const userCommentsCount = await db
        .collection('soft_comments')
        .where('authorId', '==', user.userId)
        .where('isDeleted', '==', false)
        .count()
        .get();

      if (userCommentsCount.data().count >= 200) {
        return NextResponse.json(
          {
            success: false,
            error: 'Comment limit reached',
            message:
              'You have reached the maximum of 200 comments. Upgrade to Hive for unlimited comments.',
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }

      const now = new Date();
      const commentData = {
        postId,
        postPermlink,
        authorId: user.userId,
        authorUsername: user.username,
        authorDisplayName: user.displayName || null,
        authorAvatar: user.avatar || null,
        parentCommentId: parentCommentId || null,
        body: commentBody,
        createdAt: now,
        updatedAt: now,
        likeCount: 0,
        isDeleted: false,
      };

      const docRef = await db.collection('soft_comments').add(commentData);

      // Update user's lastActiveAt timestamp (fire-and-forget)
      updateUserLastActiveAt(user.userId);

      // Update comment count on the post if it's a soft post
      if (postId.startsWith('soft-') || !postId.includes('-')) {
        const actualPostId = postId.replace('soft-', '');
        const postRef = db.collection('soft_posts').doc(actualPostId);
        postRef
          .update({
            commentCount: FieldValue.increment(1),
          })
          .catch((err) => console.error('Failed to increment comment count:', err));
      }

      // Fetch post doc and parent comment doc in parallel for notifications
      const [postDoc, parentDoc] = await Promise.all([
        db.collection('soft_posts').doc(postId.replace('soft-', '')).get(),
        parentCommentId
          ? db.collection('soft_comments').doc(parentCommentId).get()
          : Promise.resolve(null),
      ]);

      // Create notifications in parallel
      const notificationPromises: Promise<unknown>[] = [];

      if (postDoc.exists) {
        const postData = postDoc.data();
        if (postData?.authorId && postData.authorId !== user.userId) {
          notificationPromises.push(
            db.collection('soft_notifications').add({
              recipientId: postData.authorId,
              type: 'comment',
              title: 'New Comment',
              message: `${user.username} commented on your post`,
              sourceUserId: user.userId,
              sourceUsername: user.username,
              data: {
                postId,
                postPermlink,
                commentId: docRef.id,
              },
              read: false,
              createdAt: now,
            })
          );
        }
      }

      if (parentDoc?.exists) {
        const parentData = parentDoc.data();
        if (parentData?.authorId && parentData.authorId !== user.userId) {
          notificationPromises.push(
            db.collection('soft_notifications').add({
              recipientId: parentData.authorId,
              type: 'reply',
              title: 'New Reply',
              message: `${user.username} replied to your comment`,
              sourceUserId: user.userId,
              sourceUsername: user.username,
              data: {
                postId,
                postPermlink,
                commentId: docRef.id,
                parentCommentId,
              },
              read: false,
              createdAt: now,
            })
          );
        }
      }

      if (notificationPromises.length > 0) {
        await Promise.all(notificationPromises);
      }

      const comment: SoftComment = {
        id: docRef.id,
        postId,
        postPermlink,
        authorId: user.userId,
        authorUsername: user.username,
        authorDisplayName: user.displayName,
        authorAvatar: user.avatar,
        parentCommentId: parentCommentId || undefined,
        body: commentBody,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        likeCount: 0,
        isDeleted: false,
      };

      return NextResponse.json({
        success: true,
        comment,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// PATCH /api/soft/comments - Update a comment
// ============================================

export async function PATCH(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request, { includeProfile: true });
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = updateCommentSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { commentId, body: newBody } = parseResult.data;

      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      const commentRef = db.collection('soft_comments').doc(commentId);
      const commentDoc = await commentRef.get();

      if (!commentDoc.exists) {
        return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
      }

      const commentData = commentDoc.data();
      if (commentData?.authorId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only edit your own comments' },
          { status: 403 }
        );
      }

      if (commentData?.isDeleted) {
        return NextResponse.json(
          { success: false, error: 'Cannot edit a deleted comment' },
          { status: 400 }
        );
      }

      const now = new Date();
      await commentRef.update({
        body: newBody,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        comment: {
          ...commentData,
          id: commentId,
          body: newBody,
          updatedAt: now.toISOString(),
        },
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// DELETE /api/soft/comments - Soft delete a comment
// ============================================

export async function DELETE(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request, { includeProfile: true });
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = deleteCommentSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { commentId } = parseResult.data;

      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      const commentRef = db.collection('soft_comments').doc(commentId);
      const commentDoc = await commentRef.get();

      if (!commentDoc.exists) {
        return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
      }

      const commentData = commentDoc.data();
      if (commentData?.authorId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only delete your own comments' },
          { status: 403 }
        );
      }

      // Soft delete - mark as deleted but keep for reference
      await commentRef.update({
        isDeleted: true,
        body: '[deleted]',
        updatedAt: new Date(),
      });

      // Decrement comment count on the post
      const postId = commentData?.postId;
      if (postId && (postId.startsWith('soft-') || !postId.includes('-'))) {
        const actualPostId = postId.replace('soft-', '');
        const postRef = db.collection('soft_posts').doc(actualPostId);
        postRef
          .update({
            commentCount: FieldValue.increment(-1),
          })
          .catch((err) => console.error('Failed to decrement comment count:', err));
      }

      return NextResponse.json({
        success: true,
        message: 'Comment deleted',
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
