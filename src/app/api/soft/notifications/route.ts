import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/notifications';

// ============================================
// Types
// ============================================

export interface SoftNotification {
  id: string;
  recipientId: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'system';
  title: string;
  message: string;
  sourceUserId?: string;
  sourceUsername?: string;
  data?: {
    postId?: string;
    postPermlink?: string;
    commentId?: string;
    parentCommentId?: string;
    targetType?: string;
    targetId?: string;
  };
  read: boolean;
  createdAt: string;
}

// ============================================
// Validation Schemas
// ============================================

const getNotificationsSchema = z.object({
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
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1).max(100).optional(),
  markAllRead: z.boolean().optional(),
});

const deleteNotificationsSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1).max(100).optional(),
  deleteAllRead: z.boolean().optional(),
});

// ============================================
// GET /api/soft/notifications - Fetch user's notifications
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const user = await getAuthenticatedUserFromSession(request);
    if (!user) {
      return unauthorizedError('Authentication required', ctx.requestId);
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getNotificationsSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { limit, offset, unreadOnly } = parseResult.data;

    // Build where clause
    const where: Record<string, unknown> = { recipientId: user.userId };
    if (unreadOnly) {
      where.read = false;
    }

    // Get total count, unread count, and paginated data in parallel
    const [totalCount, unreadCount, rows] = await Promise.all([
      prisma.notification.count({ where: { recipientId: user.userId } }),
      prisma.notification.count({ where: { recipientId: user.userId, read: false } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const notifications: SoftNotification[] = rows.map(
      (row: {
        id: string;
        recipientId: string;
        type: string;
        title: string;
        message: string;
        sourceUserId: string | null;
        sourceUsername: string | null;
        data: unknown;
        read: boolean;
        createdAt: Date;
      }) => ({
        id: row.id,
        recipientId: row.recipientId,
        type: row.type as SoftNotification['type'],
        title: row.title,
        message: row.message,
        sourceUserId: row.sourceUserId || undefined,
        sourceUsername: row.sourceUsername || undefined,
        data: row.data as SoftNotification['data'],
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        total: totalCount,
        unreadCount,
        offset,
        limit,
        hasMore: offset + notifications.length < totalCount,
      },
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/notifications - Mark notifications as read
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
      const parseResult = markReadSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { notificationIds, markAllRead } = parseResult.data;

      if (!notificationIds && !markAllRead) {
        return validationError(
          'Either notificationIds or markAllRead must be provided',
          ctx.requestId
        );
      }

      let updatedCount = 0;

      if (markAllRead) {
        // Mark all unread notifications as read
        const result = await prisma.notification.updateMany({
          where: { recipientId: user.userId, read: false },
          data: { read: true },
        });
        updatedCount = result.count;
      } else if (notificationIds) {
        // Mark specific notifications as read (only if owned by user)
        const result = await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            recipientId: user.userId,
          },
          data: { read: true },
        });
        updatedCount = result.count;
      }

      // Get new unread count
      const unreadCount = await prisma.notification.count({
        where: { recipientId: user.userId, read: false },
      });

      return NextResponse.json({
        success: true,
        updatedCount,
        unreadCount,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// DELETE /api/soft/notifications - Delete notifications
// ============================================

export async function DELETE(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request);
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = deleteNotificationsSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { notificationIds, deleteAllRead } = parseResult.data;

      if (!notificationIds && !deleteAllRead) {
        return validationError(
          'Either notificationIds or deleteAllRead must be provided',
          ctx.requestId
        );
      }

      let deletedCount = 0;

      if (deleteAllRead) {
        // Delete all read notifications
        const result = await prisma.notification.deleteMany({
          where: { recipientId: user.userId, read: true },
        });
        deletedCount = result.count;
      } else if (notificationIds) {
        // Delete specific notifications (only if owned by user)
        const result = await prisma.notification.deleteMany({
          where: {
            id: { in: notificationIds },
            recipientId: user.userId,
          },
        });
        deletedCount = result.count;
      }

      return NextResponse.json({
        success: true,
        deletedCount,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
