import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Notification retention in days
const NOTIFICATION_RETENTION_DAYS = 30;

// Batch sizes for deletion
const BATCH_SIZE = 500;

/**
 * Cron endpoint for cleaning up old notifications
 *
 * Runs daily to delete notifications older than 30 days
 * This helps minimize Firebase costs and keeps the database clean
 */
export async function GET() {
  // Verify cron authentication
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({
      success: false,
      error: 'Database not configured - notification cleanup skipped',
    }, { status: 503 });
  }

  console.log('[Cron] Starting notification cleanup...');

  const results = {
    notificationsDeleted: 0,
    errors: [] as string[],
  };

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS);

    let hasMore = true;
    let iterations = 0;
    const maxIterations = 10; // Safety limit

    while (hasMore && iterations < maxIterations) {
      iterations++;

      // Query for old notifications
      const oldNotifications = await db.collection('soft_notifications')
        .where('createdAt', '<', cutoffDate)
        .limit(BATCH_SIZE)
        .get();

      if (oldNotifications.empty) {
        hasMore = false;
        continue;
      }

      // Delete in batches
      const batch = db.batch();
      for (const doc of oldNotifications.docs) {
        batch.delete(doc.ref);
      }

      try {
        await batch.commit();
        results.notificationsDeleted += oldNotifications.size;
        console.log(`[Cron] Deleted ${oldNotifications.size} old notifications (iteration ${iterations})`);
      } catch (error) {
        results.errors.push(`Batch delete failed: ${error}`);
        hasMore = false;
      }

      // Check if we've deleted all
      if (oldNotifications.size < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // Also clean up any orphaned notifications (no recipientId)
    const orphanedNotifications = await db.collection('soft_notifications')
      .where('recipientId', '==', null)
      .limit(100)
      .get();

    if (!orphanedNotifications.empty) {
      const orphanBatch = db.batch();
      for (const doc of orphanedNotifications.docs) {
        orphanBatch.delete(doc.ref);
      }
      await orphanBatch.commit();
      results.notificationsDeleted += orphanedNotifications.size;
      console.log(`[Cron] Deleted ${orphanedNotifications.size} orphaned notifications`);
    }

    console.log('[Cron] Notification cleanup completed', results);

    return NextResponse.json({
      success: true,
      message: 'Notification cleanup completed',
      results,
    });
  } catch (error) {
    console.error('[Cron] Error during notification cleanup:', error);
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
