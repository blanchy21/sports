import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Inactivity thresholds in days
const FIRST_WARNING_DAYS = 150;
const FINAL_WARNING_DAYS = 170;
const EXPIRATION_DAYS = 180;

// Batch sizes for processing
const BATCH_SIZE = 50;

/**
 * Cron endpoint for checking user inactivity and managing content expiration
 *
 * Runs weekly to:
 * 1. Send warning notification at 150 days inactive
 * 2. Send final warning at 170 days inactive
 * 3. Archive/delete content at 180 days inactive
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
      error: 'Database not configured - inactivity check skipped',
    }, { status: 503 });
  }

  console.log('[Cron] Starting inactivity check...');

  const results = {
    firstWarningsSent: 0,
    finalWarningsSent: 0,
    usersArchived: 0,
    postsDeleted: 0,
    commentsDeleted: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();

    // Calculate cutoff dates
    const firstWarningCutoff = new Date(now);
    firstWarningCutoff.setDate(firstWarningCutoff.getDate() - FIRST_WARNING_DAYS);

    const finalWarningCutoff = new Date(now);
    finalWarningCutoff.setDate(finalWarningCutoff.getDate() - FINAL_WARNING_DAYS);

    const expirationCutoff = new Date(now);
    expirationCutoff.setDate(expirationCutoff.getDate() - EXPIRATION_DAYS);

    // ============================================
    // Step 1: Send first warnings (150+ days inactive)
    // ============================================
    console.log('[Cron] Checking for 150+ day inactive users...');

    const firstWarningUsers = await db.collection('profiles')
      .where('isHiveUser', '==', false)
      .where('lastActiveAt', '<=', firstWarningCutoff)
      .where('lastActiveAt', '>', finalWarningCutoff)
      .limit(BATCH_SIZE)
      .get();

    for (const userDoc of firstWarningUsers.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check if we already sent a first warning
      const existingWarning = await db.collection('soft_notifications')
        .where('recipientId', '==', userId)
        .where('type', '==', 'system')
        .where('data.warningType', '==', 'inactivity_first')
        .limit(1)
        .get();

      if (existingWarning.empty) {
        try {
          await db.collection('soft_notifications').add({
            recipientId: userId,
            type: 'system',
            title: 'We miss you!',
            message: `Hi ${userData.username}! It's been a while since you've visited. Log in to keep your content active. Accounts inactive for 180 days may have their content archived.`,
            data: {
              warningType: 'inactivity_first',
              daysInactive: FIRST_WARNING_DAYS,
            },
            read: false,
            createdAt: now,
          });
          results.firstWarningsSent++;
        } catch (error) {
          results.errors.push(`Failed to send first warning to ${userId}: ${error}`);
        }
      }
    }

    // ============================================
    // Step 2: Send final warnings (170+ days inactive)
    // ============================================
    console.log('[Cron] Checking for 170+ day inactive users...');

    const finalWarningUsers = await db.collection('profiles')
      .where('isHiveUser', '==', false)
      .where('lastActiveAt', '<=', finalWarningCutoff)
      .where('lastActiveAt', '>', expirationCutoff)
      .limit(BATCH_SIZE)
      .get();

    for (const userDoc of finalWarningUsers.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check if we already sent a final warning
      const existingWarning = await db.collection('soft_notifications')
        .where('recipientId', '==', userId)
        .where('type', '==', 'system')
        .where('data.warningType', '==', 'inactivity_final')
        .limit(1)
        .get();

      if (existingWarning.empty) {
        try {
          await db.collection('soft_notifications').add({
            recipientId: userId,
            type: 'system',
            title: 'Action Required: Content Deletion in 10 Days',
            message: `Hi ${userData.username}! Your account has been inactive for ${FINAL_WARNING_DAYS} days. Please log in within the next 10 days to keep your content. After ${EXPIRATION_DAYS} days of inactivity, your posts and comments will be archived.`,
            data: {
              warningType: 'inactivity_final',
              daysInactive: FINAL_WARNING_DAYS,
              daysUntilDeletion: EXPIRATION_DAYS - FINAL_WARNING_DAYS,
            },
            read: false,
            createdAt: now,
          });
          results.finalWarningsSent++;
        } catch (error) {
          results.errors.push(`Failed to send final warning to ${userId}: ${error}`);
        }
      }
    }

    // ============================================
    // Step 3: Archive content for expired users (180+ days inactive)
    // ============================================
    console.log('[Cron] Checking for 180+ day inactive users...');

    const expiredUsers = await db.collection('profiles')
      .where('isHiveUser', '==', false)
      .where('lastActiveAt', '<=', expirationCutoff)
      .limit(BATCH_SIZE)
      .get();

    for (const userDoc of expiredUsers.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Skip if already archived
      if (userData.isArchived) {
        continue;
      }

      try {
        // Archive user's posts (soft delete)
        const userPosts = await db.collection('soft_posts')
          .where('authorId', '==', userId)
          .limit(500)
          .get();

        const postBatch = db.batch();
        let postCount = 0;
        for (const postDoc of userPosts.docs) {
          postBatch.update(postDoc.ref, {
            isArchived: true,
            archivedAt: FieldValue.serverTimestamp(),
            archivedReason: 'inactivity',
          });
          postCount++;
        }
        if (postCount > 0) {
          await postBatch.commit();
          results.postsDeleted += postCount;
        }

        // Archive user's comments (soft delete)
        const userComments = await db.collection('soft_comments')
          .where('authorId', '==', userId)
          .where('isDeleted', '==', false)
          .limit(500)
          .get();

        const commentBatch = db.batch();
        let commentCount = 0;
        for (const commentDoc of userComments.docs) {
          commentBatch.update(commentDoc.ref, {
            isArchived: true,
            archivedAt: FieldValue.serverTimestamp(),
            body: '[archived due to inactivity]',
          });
          commentCount++;
        }
        if (commentCount > 0) {
          await commentBatch.commit();
          results.commentsDeleted += commentCount;
        }

        // Mark user as archived
        await userDoc.ref.update({
          isArchived: true,
          archivedAt: FieldValue.serverTimestamp(),
        });

        results.usersArchived++;

        console.log(`[Cron] Archived user ${userId}: ${postCount} posts, ${commentCount} comments`);
      } catch (error) {
        results.errors.push(`Failed to archive user ${userId}: ${error}`);
      }
    }

    console.log('[Cron] Inactivity check completed', results);

    return NextResponse.json({
      success: true,
      message: 'Inactivity check completed',
      results,
    });
  } catch (error) {
    console.error('[Cron] Error during inactivity check:', error);
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
