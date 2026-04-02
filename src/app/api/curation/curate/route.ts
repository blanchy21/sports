/**
 * Curation API — Curate a Post
 *
 * POST: Curator allocates MEDALS to a post author.
 * 1. Verifies curator authorization via CuratorRoster
 * 2. Checks daily limit
 * 3. Verifies post has sportsblock 5% beneficiary
 * 4. Transfers MEDALS from @sportsblock → author
 * 5. Posts !medals comment on-chain
 * 6. Creates notification for author
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler, forbiddenError } from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { isCuratorAsync } from '@/lib/rewards/curator-rewards';
import { fetchPostWithBeneficiaries } from '@/lib/curation/beneficiary-check';
import { checkCurationEligibility } from '@/lib/curation/eligibility';
import {
  CURATION_MEDALS_AMOUNT,
  MAX_CURATIONS_PER_DAY,
  buildCurationComment,
} from '@/lib/curation/config';
import { transferCurationMedals } from '@/lib/curation/transfer';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/curation/curate';

const curateSchema = z.object({
  author: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9.-]{2,15}$/, 'Invalid Hive username'),
  permlink: z.string().min(1).max(256),
});

export const POST = createApiHandler(ROUTE, async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    // Auth: must be a Hive-authenticated curator
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return forbiddenError('Authentication required');
    }
    if (user.authType !== 'hive') {
      return forbiddenError('Hive authentication required for curation');
    }

    const curator = await isCuratorAsync(user.username);
    if (!curator) {
      return forbiddenError('You are not a designated curator');
    }

    // Parse input
    const body = await request.json();
    const { author, permlink } = curateSchema.parse(body);

    // Can't curate your own posts
    if (author === user.username) {
      return NextResponse.json(
        { success: false, error: 'Cannot curate your own posts' },
        { status: 400 }
      );
    }

    // Check daily limit
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const dailyCount = await prisma.curation.count({
      where: {
        curatorUsername: user.username,
        createdAt: { gte: todayStart },
        status: { not: 'failed' },
      },
    });

    if (dailyCount >= MAX_CURATIONS_PER_DAY) {
      return NextResponse.json(
        {
          success: false,
          error: `Daily curation limit reached (${MAX_CURATIONS_PER_DAY} per day)`,
          dailyCount,
          limit: MAX_CURATIONS_PER_DAY,
        },
        { status: 429 }
      );
    }

    // Fetch post from Hive and verify eligibility
    const post = await fetchPostWithBeneficiaries(author, permlink);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found on the Hive blockchain' },
        { status: 404 }
      );
    }

    const eligibility = checkCurationEligibility({
      beneficiaries: post.beneficiaries,
      category: post.category,
      parent_author: post.parentAuthor,
    });

    if (!eligibility.eligible) {
      return NextResponse.json({ success: false, error: eligibility.reason }, { status: 400 });
    }

    // Check for duplicate (unique constraint will also catch this)
    const existing = await prisma.curation.findUnique({
      where: {
        curatorUsername_author_permlink: {
          curatorUsername: user.username,
          author,
          permlink,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'You have already curated this post' },
        { status: 409 }
      );
    }

    // Create curation record (pending)
    const curation = await prisma.curation.create({
      data: {
        curatorUsername: user.username,
        author,
        permlink,
        amount: CURATION_MEDALS_AMOUNT,
        source: 'in_app',
        status: 'pending',
      },
    });

    // Transfer MEDALS
    let txId: string | null = null;
    try {
      txId = await transferCurationMedals(
        author,
        CURATION_MEDALS_AMOUNT,
        `Curation reward from @${user.username} for ${permlink}`
      );

      await prisma.curation.update({
        where: { id: curation.id },
        data: { status: 'completed', txId },
      });
    } catch (transferError) {
      logger.error(
        `MEDALS transfer failed for curation ${curation.id}`,
        'curation:curate',
        transferError
      );

      await prisma.curation.update({
        where: { id: curation.id },
        data: { status: 'failed' },
      });

      return NextResponse.json(
        { success: false, error: 'MEDALS transfer failed. Please try again.' },
        { status: 500 }
      );
    }

    // Fire-and-forget: post !medals comment on-chain, notify author, update stats
    Promise.all([
      postCurationComment(user.username, author, permlink).catch((err) =>
        logger.error('Failed to post curation comment', 'curation:curate', err)
      ),
      createCurationNotification(user.username, author, permlink, CURATION_MEDALS_AMOUNT).catch(
        (err) => logger.error('Failed to create curation notification', 'curation:curate', err)
      ),
      updateAuthorStats(author, CURATION_MEDALS_AMOUNT).catch((err) =>
        logger.error('Failed to update author stats', 'curation:curate', err)
      ),
    ]).catch(() => {});

    logger.info(
      `Curation: @${user.username} → @${author}/${permlink} (${CURATION_MEDALS_AMOUNT} MEDALS, tx: ${txId})`,
      'curation:curate'
    );

    return NextResponse.json({
      success: true,
      curation: {
        id: curation.id,
        curator: user.username,
        author,
        permlink,
        amount: CURATION_MEDALS_AMOUNT,
        txId,
      },
      remaining: MAX_CURATIONS_PER_DAY - dailyCount - 1,
    });
  });
});

/**
 * Post a !medals comment on the Hive blockchain under the curated post.
 */
async function postCurationComment(
  curator: string,
  author: string,
  permlink: string
): Promise<void> {
  const activeKeyWif = process.env.SPORTSBLOCK_ACTIVE_KEY;
  if (!activeKeyWif) return;

  const { PrivateKey } = await import('@hiveio/dhive');
  const { getDhiveClient } = await import('@/lib/hive/dhive-client');

  const dhive = getDhiveClient();
  const postingKey = PrivateKey.fromString(process.env.SPORTSBLOCK_POSTING_KEY || activeKeyWif);

  const commentPermlink = `re-${permlink}-medals-${Date.now()}`.slice(0, 255);
  const commentBody = buildCurationComment(curator, CURATION_MEDALS_AMOUNT);

  const op: [string, Record<string, unknown>] = [
    'comment',
    {
      parent_author: author,
      parent_permlink: permlink,
      author: 'sportsblock',
      permlink: commentPermlink,
      title: '',
      body: commentBody,
      json_metadata: JSON.stringify({
        app: 'sportsblock/curation',
        tags: ['sportsblock', 'medals', 'curation'],
      }),
    },
  ];

  await dhive.broadcast.sendOperations([op] as never[], postingKey);

  // Store the comment permlink on the curation record
  await prisma.curation.updateMany({
    where: { curatorUsername: curator, author, permlink },
    data: { hiveCommentPermlink: commentPermlink },
  });
}

/**
 * Create a notification for the post author about their curation.
 */
async function createCurationNotification(
  curator: string,
  author: string,
  permlink: string,
  amount: number
): Promise<void> {
  // Try to find author in our DB (they may be Hive-only with no local profile)
  const authorUser = await prisma.custodialUser.findFirst({
    where: { hiveUsername: author },
    select: { id: true },
  });

  await prisma.notification.create({
    data: {
      recipientUsername: author,
      ...(authorUser ? { recipientId: authorUser.id } : {}),
      type: 'curation',
      title: 'Your post was curated!',
      message: `@${curator} awarded you ${amount} MEDALS for your post`,
      data: { curator, author, permlink, amount },
      sourceUsername: curator,
    },
  });
}

/**
 * Increment author's totalMedalsEarned.
 */
async function updateAuthorStats(author: string, amount: number): Promise<void> {
  await prisma.userStats.upsert({
    where: { username: author },
    update: { totalMedalsEarned: { increment: amount } },
    create: {
      username: author,
      totalMedalsEarned: amount,
      totalPosts: 0,
      totalSportsbites: 0,
      totalComments: 0,
      totalViewsReceived: 0,
      totalTipsReceived: 0,
    },
  });
}
