import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
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
  isHiveUser?: boolean;
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

    const where: Record<string, unknown> = { isDeleted: false };

    if (postId) {
      where.postId = postId;
    } else if (postPermlink) {
      where.postPermlink = postPermlink;
    }

    // Filter by parent for threaded comments
    if (parentCommentId === '') {
      // Top-level comments only
      where.parentCommentId = null;
    } else if (parentCommentId) {
      // Replies to specific comment
      where.parentCommentId = parentCommentId;
    }

    const rows = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const comments: SoftComment[] = rows.map((row) => ({
      id: row.id,
      postId: row.postId,
      postPermlink: row.postPermlink,
      authorId: row.authorId,
      authorUsername: row.authorUsername,
      authorDisplayName: row.authorDisplayName || undefined,
      authorAvatar: row.authorAvatar || undefined,
      isHiveUser: row.isHiveUser || false,
      parentCommentId: row.parentCommentId || undefined,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      likeCount: row.likeCount || 0,
      isDeleted: row.isDeleted || false,
    }));

    return NextResponse.json(
      {
        success: true,
        comments,
        count: comments.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
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

      // Rate limiting check
      const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.softComments, 'softComments');
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message:
              'You are commenting too frequently. Please wait before posting another comment.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softComments.limit
            ),
          }
        );
      }

      // Check comment limit (200 per user)
      const userCommentsCount = await prisma.comment.count({
        where: { authorId: user.userId, isDeleted: false },
      });

      if (userCommentsCount >= 200) {
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

      const isHiveUser = user.authType === 'hive';
      const now = new Date();

      const newComment = await prisma.comment.create({
        data: {
          postId,
          postPermlink,
          authorId: user.userId,
          authorUsername: user.username,
          authorDisplayName: user.displayName || null,
          authorAvatar: user.avatar || null,
          isHiveUser,
          parentCommentId: parentCommentId || null,
          body: commentBody,
          createdAt: now,
          likeCount: 0,
          isDeleted: false,
        },
      });

      // Update user's lastActiveAt timestamp (fire-and-forget)
      prisma.profile
        .update({
          where: { id: user.userId },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});

      // Update comment count on the post if it's a soft post
      if (postId.startsWith('soft-') || !postId.includes('-')) {
        const actualPostId = postId.replace('soft-', '');
        prisma.post
          .update({
            where: { id: actualPostId },
            data: { commentCount: { increment: 1 } },
          })
          .catch((err: unknown) => console.error('Failed to increment comment count:', err));
      }

      // Fetch post doc and parent comment doc in parallel for notifications
      const [postDoc, parentDoc] = await Promise.all([
        prisma.post.findUnique({ where: { id: postId.replace('soft-', '') } }),
        parentCommentId
          ? prisma.comment.findUnique({ where: { id: parentCommentId } })
          : Promise.resolve(null),
      ]);

      // Create notifications in parallel
      const notificationPromises: Promise<unknown>[] = [];

      if (postDoc) {
        if (postDoc.authorId && postDoc.authorId !== user.userId) {
          notificationPromises.push(
            prisma.notification.create({
              data: {
                recipientId: postDoc.authorId,
                type: 'comment',
                title: 'New Comment',
                message: `${user.username} commented on your post`,
                sourceUserId: user.userId,
                sourceUsername: user.username,
                data: {
                  postId,
                  postPermlink,
                  commentId: newComment.id,
                },
                read: false,
                createdAt: now,
              },
            })
          );
        }
      }

      if (parentDoc) {
        if (parentDoc.authorId && parentDoc.authorId !== user.userId) {
          notificationPromises.push(
            prisma.notification.create({
              data: {
                recipientId: parentDoc.authorId,
                type: 'reply',
                title: 'New Reply',
                message: `${user.username} replied to your comment`,
                sourceUserId: user.userId,
                sourceUsername: user.username,
                data: {
                  postId,
                  postPermlink,
                  commentId: newComment.id,
                  parentCommentId,
                },
                read: false,
                createdAt: now,
              },
            })
          );
        }
      }

      if (notificationPromises.length > 0) {
        await Promise.all(notificationPromises);
      }

      const comment: SoftComment = {
        id: newComment.id,
        postId,
        postPermlink,
        authorId: user.userId,
        authorUsername: user.username,
        authorDisplayName: user.displayName,
        authorAvatar: user.avatar,
        isHiveUser,
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

      const commentDoc = await prisma.comment.findUnique({ where: { id: commentId } });

      if (!commentDoc) {
        return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
      }

      if (commentDoc.authorId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only edit your own comments' },
          { status: 403 }
        );
      }

      if (commentDoc.isDeleted) {
        return NextResponse.json(
          { success: false, error: 'Cannot edit a deleted comment' },
          { status: 400 }
        );
      }

      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { body: newBody },
      });

      return NextResponse.json({
        success: true,
        comment: {
          id: commentId,
          postId: commentDoc.postId,
          postPermlink: commentDoc.postPermlink,
          authorId: commentDoc.authorId,
          authorUsername: commentDoc.authorUsername,
          authorDisplayName: commentDoc.authorDisplayName,
          authorAvatar: commentDoc.authorAvatar,
          isHiveUser: commentDoc.isHiveUser,
          parentCommentId: commentDoc.parentCommentId,
          body: newBody,
          likeCount: commentDoc.likeCount,
          isDeleted: commentDoc.isDeleted,
          createdAt: commentDoc.createdAt,
          updatedAt: updated.updatedAt.toISOString(),
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

      const commentDoc = await prisma.comment.findUnique({ where: { id: commentId } });

      if (!commentDoc) {
        return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
      }

      if (commentDoc.authorId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only delete your own comments' },
          { status: 403 }
        );
      }

      // Soft delete - mark as deleted but keep for reference
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          isDeleted: true,
          body: '[deleted]',
        },
      });

      // Decrement comment count on the post
      const postId = commentDoc.postId;
      if (postId && (postId.startsWith('soft-') || !postId.includes('-'))) {
        const actualPostId = postId.replace('soft-', '');
        prisma.post
          .update({
            where: { id: actualPostId },
            data: { commentCount: { increment: -1 } },
          })
          .catch((err: unknown) => console.error('Failed to decrement comment count:', err));
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
