import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';

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

    const firstWarningUsers = await prisma.profile.findMany({
      where: {
        isHiveUser: false,
        lastActiveAt: {
          lte: firstWarningCutoff,
          gt: finalWarningCutoff,
        },
      },
      take: BATCH_SIZE,
    });

    for (const user of firstWarningUsers) {
      // Check if we already sent a first warning
      const existingWarning = await prisma.notification.findFirst({
        where: {
          recipientId: user.id,
          type: 'system',
          data: { path: ['warningType'], equals: 'inactivity_first' },
        },
      });

      if (!existingWarning) {
        try {
          await prisma.notification.create({
            data: {
              recipientId: user.id,
              type: 'system',
              title: 'We miss you!',
              message: `Hi ${user.username}! It's been a while since you've visited. Log in to keep your content active. Accounts inactive for 180 days may have their content archived.`,
              data: {
                warningType: 'inactivity_first',
                daysInactive: FIRST_WARNING_DAYS,
              },
              read: false,
            },
          });
          results.firstWarningsSent++;
        } catch (error) {
          results.errors.push(`Failed to send first warning to ${user.id}: ${error}`);
        }
      }
    }

    // ============================================
    // Step 2: Send final warnings (170+ days inactive)
    // ============================================
    console.log('[Cron] Checking for 170+ day inactive users...');

    const finalWarningUsers = await prisma.profile.findMany({
      where: {
        isHiveUser: false,
        lastActiveAt: {
          lte: finalWarningCutoff,
          gt: expirationCutoff,
        },
      },
      take: BATCH_SIZE,
    });

    for (const user of finalWarningUsers) {
      // Check if we already sent a final warning
      const existingWarning = await prisma.notification.findFirst({
        where: {
          recipientId: user.id,
          type: 'system',
          data: { path: ['warningType'], equals: 'inactivity_final' },
        },
      });

      if (!existingWarning) {
        try {
          await prisma.notification.create({
            data: {
              recipientId: user.id,
              type: 'system',
              title: 'Action Required: Content Deletion in 10 Days',
              message: `Hi ${user.username}! Your account has been inactive for ${FINAL_WARNING_DAYS} days. Please log in within the next 10 days to keep your content. After ${EXPIRATION_DAYS} days of inactivity, your posts and comments will be archived.`,
              data: {
                warningType: 'inactivity_final',
                daysInactive: FINAL_WARNING_DAYS,
                daysUntilDeletion: EXPIRATION_DAYS - FINAL_WARNING_DAYS,
              },
              read: false,
            },
          });
          results.finalWarningsSent++;
        } catch (error) {
          results.errors.push(`Failed to send final warning to ${user.id}: ${error}`);
        }
      }
    }

    // ============================================
    // Step 3: Archive content for expired users (180+ days inactive)
    // ============================================
    console.log('[Cron] Checking for 180+ day inactive users...');

    const expiredUsers = await prisma.profile.findMany({
      where: {
        isHiveUser: false,
        lastActiveAt: { lte: expirationCutoff },
      },
      take: BATCH_SIZE,
    });

    for (const user of expiredUsers) {
      try {
        // Delete user's posts
        const postResult = await prisma.post.deleteMany({
          where: { authorId: user.id },
        });
        results.postsDeleted += postResult.count;

        // Soft-delete user's comments (mark as deleted)
        const commentResult = await prisma.comment.updateMany({
          where: { authorId: user.id, isDeleted: false },
          data: { isDeleted: true, body: '[archived due to inactivity]' },
        });
        results.commentsDeleted += commentResult.count;

        results.usersArchived++;

        console.log(
          `[Cron] Archived user ${user.id}: ${postResult.count} posts, ${commentResult.count} comments`
        );
      } catch (error) {
        results.errors.push(`Failed to archive user ${user.id}: ${error}`);
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
