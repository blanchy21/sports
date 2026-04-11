import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Notification retention in days
const NOTIFICATION_RETENTION_DAYS = 30;

// Batch sizes for deletion
const BATCH_SIZE = 500;

/**
 * Cron endpoint for cleaning up old notifications
 *
 * Runs daily to delete notifications older than 30 days
 * This helps minimize database costs and keeps the database clean
 */
export async function GET() {
  // Verify cron authentication
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  logger.info('Starting notification cleanup', 'cron:notification-cleanup');

  const results = {
    notificationsDeleted: 0,
    errors: [] as string[],
  };

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS);

    // Batch-delete old notifications. The previous implementation did a
    // COUNT query per iteration — that's a full sequential scan of old rows
    // on every tick and adds up to real DB load. The short-circuit on
    // `toDelete.length < BATCH_SIZE` is enough to exit the loop; no count
    // needed.
    let hasMore = true;
    let iterations = 0;
    const maxIterations = 10; // Safety limit

    while (hasMore && iterations < maxIterations) {
      iterations++;
      try {
        const toDelete = await prisma.notification.findMany({
          where: { createdAt: { lt: cutoffDate } },
          select: { id: true },
          take: BATCH_SIZE,
        });

        if (toDelete.length === 0) {
          hasMore = false;
          continue;
        }

        const deleteResult = await prisma.notification.deleteMany({
          where: { id: { in: toDelete.map((n: { id: string }) => n.id) } },
        });

        results.notificationsDeleted += deleteResult.count;
        logger.info(
          `Deleted ${deleteResult.count} old notifications (iteration ${iterations})`,
          'cron:notification-cleanup'
        );

        if (toDelete.length < BATCH_SIZE) {
          hasMore = false;
        }
      } catch (error) {
        results.errors.push(`Batch delete failed: ${error}`);
        hasMore = false;
      }
    }

    // Also clean up any orphaned notifications (recipientId is null). The
    // previous check used `recipientId: ''` which never matched because the
    // schema stores nullable recipientIds as NULL, not empty string.
    try {
      const orphanResult = await prisma.notification.deleteMany({
        where: { recipientId: null },
      });
      if (orphanResult.count > 0) {
        results.notificationsDeleted += orphanResult.count;
        logger.info(
          `Deleted ${orphanResult.count} orphaned notifications`,
          'cron:notification-cleanup'
        );
      }
    } catch (err) {
      logger.warn('Orphan notification cleanup failed', 'cron:notification-cleanup', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    logger.info('Notification cleanup completed', 'cron:notification-cleanup', results);

    return NextResponse.json({
      success: true,
      message: 'Notification cleanup completed',
      results,
    });
  } catch (error) {
    logger.error('Error during notification cleanup', 'cron:notification-cleanup', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: message,
        partialResults: results,
      },
      { status: 500 }
    );
  }
}
