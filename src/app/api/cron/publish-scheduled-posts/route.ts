import { NextResponse } from 'next/server';
import { PrivateKey } from '@hiveio/dhive';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { prisma } from '@/lib/db/prisma';
import { getDhiveClient } from '@/lib/hive/dhive-client';
import { checkPostingAuthority } from '@/lib/hive/posting-authority';
import {
  createPostOperation,
  createCommentOptionsOperation,
} from '@/lib/hive-workerbee/hive-operations';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_LIMIT = 10;

export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  const postingKey = process.env.SPORTSBLOCK_POSTING_KEY;
  if (!postingKey) {
    logger.error('SPORTSBLOCK_POSTING_KEY not configured', 'cron/publish-scheduled-posts');
    return NextResponse.json(
      { success: false, error: 'Posting key not configured' },
      { status: 500 }
    );
  }

  const now = new Date();

  // Find due scheduled posts
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: BATCH_LIMIT,
  });

  if (duePosts.length === 0) {
    return NextResponse.json({ success: true, published: 0, failed: 0 });
  }

  logger.info(
    `Processing ${duePosts.length} scheduled post(s)`,
    'cron/publish-scheduled-posts'
  );

  const client = getDhiveClient();
  const privateKey = PrivateKey.fromString(postingKey);
  let published = 0;
  let failed = 0;

  for (const scheduledPost of duePosts) {
    const postData = scheduledPost.postData as Record<string, unknown>;
    const author = postData.authorUsername as string;

    try {
      // Verify @sportsblock still has posting authority
      const hasAuthority = await checkPostingAuthority(author);
      if (!hasAuthority) {
        throw new Error(
          `@sportsblock does not have posting authority on @${author}. ` +
          'The user may have revoked it.'
        );
      }

      // Build the comment (post) operation
      const commentOp = createPostOperation({
        author,
        title: postData.title as string,
        body: postData.content as string,
        sportCategory: postData.sportCategory as string | undefined,
        featuredImage: postData.featuredImage as string | undefined,
        tags: (postData.tags as string[]) || [],
        parentPermlink: (postData.communityId as string) || undefined,
        subCommunity: postData.communityId
          ? {
              id: postData.communityId as string,
              slug: postData.communitySlug as string,
              name: postData.communityName as string,
            }
          : undefined,
      });

      // Build comment_options with 5% beneficiary to sportsblock, 50/50 rewards
      const commentOptionsOp = createCommentOptionsOperation({
        author,
        permlink: commentOp.permlink,
        beneficiaries: [{ account: 'sportsblock', weight: 500 }],
      });

      // Broadcast using @sportsblock's posting key
      const result = await client.broadcast.sendOperations(
        [
          ['comment', commentOp],
          ['comment_options', commentOptionsOp],
        ],
        privateKey
      );

      // Mark as published
      await prisma.scheduledPost.update({
        where: { id: scheduledPost.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          publishedPostId: commentOp.permlink,
        },
      });

      logger.info(
        `Published scheduled post for @${author}: ${commentOp.permlink} (tx: ${result.id})`,
        'cron/publish-scheduled-posts'
      );
      published++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await prisma.scheduledPost.update({
        where: { id: scheduledPost.id },
        data: {
          status: 'failed',
          error: errorMsg.slice(0, 500),
        },
      });

      logger.error(
        `Failed to publish scheduled post ${scheduledPost.id} for @${author}: ${errorMsg}`,
        'cron/publish-scheduled-posts'
      );
      failed++;
    }
  }

  logger.info(
    `Scheduled posts cron complete: ${published} published, ${failed} failed`,
    'cron/publish-scheduled-posts'
  );

  return NextResponse.json({ success: true, published, failed });
}
