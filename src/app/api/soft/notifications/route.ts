import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler, validationError, unauthorizedError } from '@/lib/api/response';
import { csrfProtected } from '@/lib/api/csrf';
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

export const GET = createApiHandler(ROUTE, async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) {
    return unauthorizedError('Authentication required');
  }

  const searchParams = Object.fromEntries((request as NextRequest).nextUrl.searchParams);
  const parseResult = getNotificationsSchema.safeParse(searchParams);

  if (!parseResult.success) {
    return validationError(parseResult.error);
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
});

// ============================================
// POST /api/soft/notifications - Mark notifications as read
// ============================================

export const POST = csrfProtected(
  createApiHandler(ROUTE, async (request) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return unauthorizedError('Authentication required');
    }

    const body = await request.json();
    const parseResult = markReadSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error);
    }

    const { notificationIds, markAllRead } = parseResult.data;

    if (!notificationIds && !markAllRead) {
      return validationError('Either notificationIds or markAllRead must be provided');
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
  })
);

// ============================================
// DELETE /api/soft/notifications - Delete notifications
// ============================================

export const DELETE = csrfProtected(
  createApiHandler(ROUTE, async (request) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return unauthorizedError('Authentication required');
    }

    const body = await request.json();
    const parseResult = deleteNotificationsSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error);
    }

    const { notificationIds, deleteAllRead } = parseResult.data;

    if (!notificationIds && !deleteAllRead) {
      return validationError('Either notificationIds or deleteAllRead must be provided');
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
  })
);
