/**
 * !medals Comment Scanner Cron
 *
 * Runs hourly. Scans Hive comment history of active curators for `!medals` keyword.
 * When found on an eligible post, creates a Curation record and transfers MEDALS.
 *
 * This catches curations made from external frontends (Peakd, Ecency, etc.)
 * that the in-app CurateButton wouldn't catch.
 */

import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/api/cron-auth';
import { getCuratorAccountsAsync } from '@/lib/rewards/curator-rewards';
import { fetchPostWithBeneficiaries } from '@/lib/curation/beneficiary-check';
import { checkCurationEligibility } from '@/lib/curation/eligibility';
import { CURATION_MEDALS_AMOUNT, MAX_CURATIONS_PER_DAY } from '@/lib/curation/config';
import { transferCurationMedals } from '@/lib/curation/transfer';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Regex to detect !medals command (case-insensitive, word boundary) */
const MEDALS_COMMAND_REGEX = /\b!medals\b/i;

/** Look back 90 minutes (overlap with hourly cron for safety) */
const LOOKBACK_MINUTES = 90;

interface HiveHistoryOp {
  op: [string, Record<string, string>];
  timestamp: string;
  block: number;
  trx_id: string;
}

export async function GET() {
  const startTime = Date.now();

  try {
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const curators = await getCuratorAccountsAsync();
    const cutoffTime = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000);

    let totalScanned = 0;
    let totalMatches = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    const processed: Array<{ curator: string; author: string; permlink: string }> = [];

    for (const curator of curators) {
      try {
        const comments = await fetchRecentComments(curator, cutoffTime);
        totalScanned += comments.length;

        for (const comment of comments) {
          // Check for !medals command
          if (!MEDALS_COMMAND_REGEX.test(comment.body)) continue;
          totalMatches++;

          // Extract parent post (the post being curated)
          const parentAuthor = comment.parent_author;
          const parentPermlink = comment.parent_permlink;

          if (!parentAuthor || !parentPermlink) continue;

          // Check daily limit for this curator
          const todayStart = new Date();
          todayStart.setUTCHours(0, 0, 0, 0);

          const dailyCount = await prisma.curation.count({
            where: {
              curatorUsername: curator,
              createdAt: { gte: todayStart },
              status: { not: 'failed' },
            },
          });

          if (dailyCount >= MAX_CURATIONS_PER_DAY) {
            totalSkipped++;
            continue;
          }

          // Check if already recorded
          const existing = await prisma.curation.findUnique({
            where: {
              curatorUsername_author_permlink: {
                curatorUsername: curator,
                author: parentAuthor,
                permlink: parentPermlink,
              },
            },
          });

          if (existing) {
            totalSkipped++;
            continue;
          }

          // Verify post eligibility
          const post = await fetchPostWithBeneficiaries(parentAuthor, parentPermlink);
          if (!post) {
            totalSkipped++;
            continue;
          }

          const eligibility = checkCurationEligibility({
            beneficiaries: post.beneficiaries,
            category: post.category,
            parent_author: post.parentAuthor,
          });

          if (!eligibility.eligible) {
            totalSkipped++;
            continue;
          }

          // Don't allow self-curation
          if (parentAuthor === curator) {
            totalSkipped++;
            continue;
          }

          // Create curation record and transfer MEDALS
          const curation = await prisma.curation.create({
            data: {
              curatorUsername: curator,
              author: parentAuthor,
              permlink: parentPermlink,
              amount: CURATION_MEDALS_AMOUNT,
              source: 'hive_comment',
              hiveCommentPermlink: comment.permlink,
              status: 'pending',
            },
          });

          try {
            const txId = await transferCurationMedals(
              parentAuthor,
              CURATION_MEDALS_AMOUNT,
              `!medals curation from @${curator} via SportsBlock`
            );

            await prisma.curation.update({
              where: { id: curation.id },
              data: { status: 'completed', txId },
            });

            totalProcessed++;
            processed.push({ curator, author: parentAuthor, permlink: parentPermlink });

            logger.info(
              `!medals scan: @${curator} → @${parentAuthor}/${parentPermlink} (tx: ${txId})`,
              'cron:medals-scan'
            );
          } catch (transferError) {
            await prisma.curation.update({
              where: { id: curation.id },
              data: { status: 'failed' },
            });
            logger.error(
              `!medals transfer failed: @${curator} → @${parentAuthor}`,
              'cron:medals-scan',
              transferError
            );
          }
        }
      } catch (curatorError) {
        logger.error(`Error scanning curator ${curator}`, 'cron:medals-scan', curatorError);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        curatorsScanned: curators.length,
        commentsScanned: totalScanned,
        medalsMatches: totalMatches,
        curationsProcessed: totalProcessed,
        skipped: totalSkipped,
      },
      processed,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('!medals scan cron failed', 'cron:medals-scan', error);

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'production'
            ? 'An internal error occurred'
            : error instanceof Error
              ? error.message
              : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch recent comments from a curator's Hive account history.
 */
async function fetchRecentComments(
  curator: string,
  cutoffTime: Date
): Promise<
  Array<{ body: string; parent_author: string; parent_permlink: string; permlink: string }>
> {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_HIVE_API_URL || 'https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_account_history',
        params: [curator, -1, 200, 4], // filter type 4 = comment operations
        id: 1,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const history: Array<[number, HiveHistoryOp]> = data.result || [];
    const comments: Array<{
      body: string;
      parent_author: string;
      parent_permlink: string;
      permlink: string;
    }> = [];

    for (const [, operation] of history) {
      if (operation.op[0] !== 'comment') continue;

      const timestamp = new Date(operation.timestamp + 'Z');
      if (timestamp < cutoffTime) continue;

      const op = operation.op[1];
      // Only include replies (comments on posts), not root posts
      if (!op.parent_author || op.parent_author === '') continue;

      comments.push({
        body: op.body || '',
        parent_author: op.parent_author,
        parent_permlink: op.parent_permlink || '',
        permlink: op.permlink || '',
      });
    }

    return comments;
  } catch (error) {
    logger.error(`Error fetching comments for ${curator}`, 'cron:medals-scan', error);
    return [];
  }
}
