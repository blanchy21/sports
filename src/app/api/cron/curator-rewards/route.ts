/**
 * Curator Rewards Cron Job
 *
 * Runs daily at midnight UTC to process curator votes and queue rewards.
 *
 * This endpoint:
 * 1. Fetches recent votes from designated curators
 * 2. Filters for unprocessed votes on Sportsblock posts
 * 3. Calculates rewards and stores them for distribution
 */

import { NextResponse } from 'next/server';
import {
  getCuratorAccountsAsync,
  filterCuratorVotes,
  processCuratorVotes,
  getVoteUniqueId,
  getDailyKey,
  getCuratorStatsSummary,
  type CuratorVote,
} from '@/lib/rewards/curator-rewards';
import { getCuratorRewardAmount } from '@/lib/rewards/config';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { SPORTS_ARENA_CONFIG } from '@/lib/hive-workerbee/client';
import { parseJsonMetadata } from '@/lib/utils/hive';
import { verifyCronRequest } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Time window to look back for votes (in minutes)
// Runs daily at midnight UTC — look back 24h + 20min buffer
const VOTE_LOOKBACK_MINUTES = 1460;

/**
 * Get processed vote IDs for today to prevent double processing
 */
async function getProcessedVoteIds(): Promise<Set<string>> {
  try {
    const today = getDailyKey();
    // Use analyticsEvent as a lightweight store for daily curator data
    const record = await prisma.analyticsEvent.findFirst({
      where: { eventType: `curator-rewards-${today}` },
      orderBy: { createdAt: 'desc' },
    });

    if (record?.metadata) {
      const data = record.metadata as Record<string, unknown>;
      return new Set((data.processedVoteIds as string[]) || []);
    }
    return new Set();
  } catch (error) {
    logger.error('Error getting processed vote IDs', 'cron:curator-rewards', error);
    return new Set();
  }
}

/**
 * Get curator daily vote counts
 */
async function getCuratorDailyCounts(): Promise<Map<string, number>> {
  try {
    const today = getDailyKey();
    const record = await prisma.analyticsEvent.findFirst({
      where: { eventType: `curator-rewards-${today}` },
      orderBy: { createdAt: 'desc' },
    });

    if (record?.metadata) {
      const data = record.metadata as Record<string, unknown>;
      return new Map(Object.entries((data.curatorCounts as Record<string, number>) || {}));
    }
    return new Map();
  } catch (error) {
    logger.error('Error getting curator daily counts', 'cron:curator-rewards', error);
    return new Map();
  }
}

/**
 * Save processed rewards to database
 */
async function saveProcessedRewards(
  rewards: Array<{
    author: string;
    curator: string;
    permlink: string;
    amount: number;
    voteTimestamp: Date;
    processedAt: Date;
    transactionId: string;
  }>,
  processedVoteIds: string[],
  curatorCounts: Map<string, number>
): Promise<void> {
  try {
    const today = getDailyKey();

    // Fetch existing record
    const existing = await prisma.analyticsEvent.findFirst({
      where: { eventType: `curator-rewards-${today}` },
      orderBy: { createdAt: 'desc' },
    });

    const existingData = (existing?.metadata || {}) as Record<string, unknown>;
    const existingVoteIds = (existingData.processedVoteIds as string[]) || [];
    const existingRewards = (existingData.rewards as Array<Record<string, unknown>>) || [];

    const mergedVoteIds = [...new Set([...existingVoteIds, ...processedVoteIds])];
    const mergedRewards = [
      ...existingRewards,
      ...rewards.map((r) => ({
        ...r,
        voteTimestamp: r.voteTimestamp.toISOString(),
        processedAt: r.processedAt.toISOString(),
      })),
    ];

    const metadata = {
      date: today,
      processedVoteIds: mergedVoteIds,
      curatorCounts: Object.fromEntries(curatorCounts),
      rewards: mergedRewards,
      totalDistributed: mergedRewards.reduce((sum, r) => sum + (r.amount as number), 0),
      lastUpdated: new Date().toISOString(),
    };

    if (existing) {
      await prisma.analyticsEvent.update({
        where: { id: existing.id },
        data: { metadata: metadata as unknown as Prisma.InputJsonValue },
      });
    } else {
      await prisma.analyticsEvent.create({
        data: {
          eventType: `curator-rewards-${today}`,
          metadata: metadata as unknown as Prisma.InputJsonValue,
        },
      });
    }
  } catch (error) {
    logger.error('Error saving processed rewards', 'cron:curator-rewards', error);
    throw error;
  }
}

/**
 * Fetch recent votes from curators
 * Uses the Hive API to get account history
 */
async function fetchRecentCuratorVotes(): Promise<CuratorVote[]> {
  const curators = await getCuratorAccountsAsync();
  const votes: CuratorVote[] = [];
  const cutoffTime = new Date(Date.now() - VOTE_LOOKBACK_MINUTES * 60 * 1000);

  for (const curator of curators) {
    try {
      // Fetch recent account history for this curator
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_HIVE_API_URL || 'https://api.hive.blog'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'condenser_api.get_account_history',
            params: [curator, -1, 100, 1], // Last 100 operations, filter for votes (type 1)
            id: 1,
          }),
        }
      );

      if (!response.ok) {
        logger.warn(
          `Failed to fetch history for ${curator}: ${response.status}`,
          'cron:curator-rewards'
        );
        continue;
      }

      const data = await response.json();
      const history = data.result || [];

      for (const [, operation] of history) {
        if (operation.op[0] !== 'vote') continue;

        const voteOp = operation.op[1];
        const timestamp = new Date(operation.timestamp + 'Z');

        // Skip votes older than cutoff
        if (timestamp < cutoffTime) continue;

        votes.push({
          voter: voteOp.voter,
          author: voteOp.author,
          permlink: voteOp.permlink,
          weight: voteOp.weight,
          timestamp,
          blockNum: operation.block,
          transactionId: operation.trx_id,
        });
      }
    } catch (error) {
      logger.error(`Error fetching votes for ${curator}`, 'cron:curator-rewards', error);
    }
  }

  return votes;
}

/**
 * Verify a post belongs to Sportsblock community
 */
async function verifySportsblockPost(author: string, permlink: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_HIVE_API_URL || 'https://api.hive.blog'}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_content',
          params: [author, permlink],
          id: 1,
        }),
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    const post = data.result;

    if (!post || !post.author) return false;

    // Check if post is in Sportsblock community
    const category = post.category || '';
    const jsonMetadata = parseJsonMetadata(post.json_metadata || '');
    const tags = Array.isArray(jsonMetadata.tags) ? jsonMetadata.tags : [];
    const community = (jsonMetadata.community as string) || category;

    return (
      community === SPORTS_ARENA_CONFIG.COMMUNITY_ID ||
      tags.includes(SPORTS_ARENA_CONFIG.COMMUNITY_ID) ||
      tags.includes('sportsblock')
    );
  } catch (error) {
    logger.error(`Error verifying post ${author}/${permlink}`, 'cron:curator-rewards', error);
    return false;
  }
}

/**
 * GET handler for curator rewards cron
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Verify request authorization
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get already processed vote IDs
    const processedVoteIds = await getProcessedVoteIds();
    const curatorDailyCounts = await getCuratorDailyCounts();

    // Fetch recent curator votes
    logger.info('Fetching recent curator votes', 'cron:curator-rewards');
    const allVotes = await fetchRecentCuratorVotes();
    logger.info(`Found ${allVotes.length} total votes`, 'cron:curator-rewards');

    // Filter for unprocessed curator votes
    const eligibleVotes = filterCuratorVotes(allVotes, processedVoteIds);
    logger.info(`${eligibleVotes.length} eligible votes after filtering`, 'cron:curator-rewards');

    if (eligibleVotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new curator votes to process',
        stats: getCuratorStatsSummary(curatorDailyCounts),
        duration: Date.now() - startTime,
      });
    }

    // Verify each vote is for a Sportsblock post
    const verifiedVotes: CuratorVote[] = [];
    for (const vote of eligibleVotes) {
      const isSportsblock = await verifySportsblockPost(vote.author, vote.permlink);
      if (isSportsblock) {
        verifiedVotes.push(vote);
      }
    }
    logger.info(`${verifiedVotes.length} votes on Sportsblock posts`, 'cron:curator-rewards');

    if (verifiedVotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No curator votes on Sportsblock posts',
        stats: getCuratorStatsSummary(curatorDailyCounts),
        duration: Date.now() - startTime,
      });
    }

    // Process votes and calculate rewards
    const { rewards, updatedStats, skipped } = processCuratorVotes(
      verifiedVotes,
      curatorDailyCounts
    );

    logger.info(
      `Processed: ${rewards.length} rewards, ${skipped.length} skipped`,
      'cron:curator-rewards'
    );

    // Save to database
    if (rewards.length > 0) {
      const newVoteIds = rewards.map((r) =>
        getVoteUniqueId({
          voter: r.curator,
          author: r.author,
          permlink: r.permlink,
          weight: 0,
          timestamp: r.voteTimestamp,
          blockNum: 0,
          transactionId: r.transactionId,
        })
      );

      await saveProcessedRewards(rewards, newVoteIds, updatedStats);
    }

    const totalRewarded = rewards.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      success: true,
      message: `Processed ${rewards.length} curator rewards`,
      summary: {
        votesFound: allVotes.length,
        eligibleVotes: eligibleVotes.length,
        verifiedVotes: verifiedVotes.length,
        rewardsProcessed: rewards.length,
        skipped: skipped.length,
        totalMedalsRewarded: totalRewarded,
        rewardPerVote: getCuratorRewardAmount(),
      },
      rewards: rewards.map((r) => ({
        author: r.author,
        curator: r.curator,
        amount: r.amount,
      })),
      stats: getCuratorStatsSummary(updatedStats),
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Curator rewards cron failed', 'cron:curator-rewards', error);

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
