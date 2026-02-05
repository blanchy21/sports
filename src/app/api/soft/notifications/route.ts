import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
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

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Build query
    let query = db
      .collection('soft_notifications')
      .where('recipientId', '==', user.userId)
      .orderBy('createdAt', 'desc');

    if (unreadOnly) {
      query = query.where('read', '==', false);
    }

    // Get total count for pagination
    const countSnapshot = await db
      .collection('soft_notifications')
      .where('recipientId', '==', user.userId)
      .count()
      .get();
    const totalCount = countSnapshot.data().count;

    // Get unread count
    const unreadCountSnapshot = await db
      .collection('soft_notifications')
      .where('recipientId', '==', user.userId)
      .where('read', '==', false)
      .count()
      .get();
    const unreadCount = unreadCountSnapshot.data().count;

    // Apply pagination
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const notifications: SoftNotification[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        recipientId: data.recipientId,
        type: data.type,
        title: data.title,
        message: data.message,
        sourceUserId: data.sourceUserId,
        sourceUsername: data.sourceUsername,
        data: data.data,
        read: data.read,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      });
    });

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

      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      let updatedCount = 0;

      if (markAllRead) {
        // Mark all unread notifications as read
        const unreadSnapshot = await db
          .collection('soft_notifications')
          .where('recipientId', '==', user.userId)
          .where('read', '==', false)
          .get();

        const batch = db.batch();
        unreadSnapshot.forEach((doc) => {
          batch.update(doc.ref, { read: true });
          updatedCount++;
        });
        await batch.commit();
      } else if (notificationIds) {
        // Mark specific notifications as read
        const batch = db.batch();

        for (const notificationId of notificationIds) {
          const notificationRef = db.collection('soft_notifications').doc(notificationId);
          const notificationDoc = await notificationRef.get();

          // Only update if notification exists and belongs to user
          if (notificationDoc.exists && notificationDoc.data()?.recipientId === user.userId) {
            batch.update(notificationRef, { read: true });
            updatedCount++;
          }
        }

        await batch.commit();
      }

      // Get new unread count
      const unreadCountSnapshot = await db
        .collection('soft_notifications')
        .where('recipientId', '==', user.userId)
        .where('read', '==', false)
        .count()
        .get();

      return NextResponse.json({
        success: true,
        updatedCount,
        unreadCount: unreadCountSnapshot.data().count,
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

      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      let deletedCount = 0;

      if (deleteAllRead) {
        // Delete all read notifications
        const readSnapshot = await db
          .collection('soft_notifications')
          .where('recipientId', '==', user.userId)
          .where('read', '==', true)
          .get();

        const batch = db.batch();
        readSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        await batch.commit();
      } else if (notificationIds) {
        // Delete specific notifications
        const batch = db.batch();

        for (const notificationId of notificationIds) {
          const notificationRef = db.collection('soft_notifications').doc(notificationId);
          const notificationDoc = await notificationRef.get();

          // Only delete if notification exists and belongs to user
          if (notificationDoc.exists && notificationDoc.data()?.recipientId === user.userId) {
            batch.delete(notificationRef);
            deletedCount++;
          }
        }

        await batch.commit();
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
