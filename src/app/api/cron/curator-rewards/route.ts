/**
 * Curator Rewards Cron Job
 *
 * Runs periodically (daily) to auto-pay MEDALS to authors whose posts got
 * upvoted by one of the designated curator accounts.
 *
 * Flow:
 *  1. Fetch recent votes from curator Hive accounts (24h lookback).
 *  2. Filter to unprocessed votes on Sportsblock-community posts only.
 *  3. Calculate a fixed reward (currently 100 MEDALS) per eligible vote,
 *     bounded by a per-curator daily cap.
 *  4. Broadcast transferMedalsFromSportsblock() for each reward.
 *  5. Only mark a vote as processed AFTER its broadcast succeeds — failures
 *     retry on the next tick within the 24h lookback window.
 *
 * Related (but distinct) systems:
 *  - /api/curation/curate — explicit CurateButton curation (100 MEDALS,
 *    one curator per post).
 *  - /api/cron/medals-scan — explicit `!medals` comment curation.
 * This cron handles the IMPLICIT upvote-based reward path. A curator who
 * upvotes AND explicitly curates the same post can pay MEDALS twice by
 * design (two distinct actions).
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
  type CuratorReward,
} from '@/lib/rewards/curator-rewards';
import { getCuratorRewardAmount } from '@/lib/rewards/config';
import { transferMedalsFromSportsblock } from '@/lib/hive-engine/server-transfer';
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
    const record = await prisma.analyticsEvent.findUnique({
      where: { eventType: `curator-rewards-${today}` },
    });

    if (record?.metadata) {
      const data = record.metadata as Record<string, unknown>;
      return new Set((data.processedVoteIds as string[]) || []);
    }
    return new Set();
  } catch (error) {
    logger.error('Error getting processed vote IDs', 'cron:curator-rewards', error);
    throw error;
  }
}

/**
 * Get curator daily vote counts
 */
async function getCuratorDailyCounts(): Promise<Map<string, number>> {
  try {
    const today = getDailyKey();
    const record = await prisma.analyticsEvent.findUnique({
      where: { eventType: `curator-rewards-${today}` },
    });

    if (record?.metadata) {
      const data = record.metadata as Record<string, unknown>;
      return new Map(Object.entries((data.curatorCounts as Record<string, number>) || {}));
    }
    return new Map();
  } catch (error) {
    logger.error('Error getting curator daily counts', 'cron:curator-rewards', error);
    throw error;
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

    const eventType = `curator-rewards-${today}`;

    // Fetch existing record
    const existing = await prisma.analyticsEvent.findUnique({
      where: { eventType },
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

    await prisma.analyticsEvent.upsert({
      where: { eventType },
      update: { metadata: metadata as unknown as Prisma.InputJsonValue },
      create: { eventType, metadata: metadata as unknown as Prisma.InputJsonValue },
    });
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

    // Calculate rewards per eligible vote
    const { rewards, updatedStats, skipped } = processCuratorVotes(
      verifiedVotes,
      curatorDailyCounts
    );

    logger.info(
      `Ready to broadcast ${rewards.length} rewards, ${skipped.length} skipped`,
      'cron:curator-rewards'
    );

    // Broadcast MEDALS transfers for each reward. Only mark a vote as
    // processed after its broadcast succeeds — a failed broadcast will be
    // retried on the next cron tick (within the 24h lookback window).
    const broadcastedRewards: CuratorReward[] = [];
    const broadcastedVoteIds: string[] = [];
    const broadcastFailures: Array<{ author: string; curator: string; error: string }> = [];

    for (const reward of rewards) {
      try {
        const txId = await transferMedalsFromSportsblock(
          reward.author,
          reward.amount,
          `Curator reward from @${reward.curator} for ${reward.permlink}`
        );
        logger.info(
          `Curator reward paid: ${reward.amount} MEDALS → @${reward.author} (from curator @${reward.curator}) tx=${txId}`,
          'cron:curator-rewards'
        );
        broadcastedRewards.push({ ...reward, transactionId: txId });
        broadcastedVoteIds.push(
          getVoteUniqueId({
            voter: reward.curator,
            author: reward.author,
            permlink: reward.permlink,
            weight: 0,
            timestamp: reward.voteTimestamp,
            blockNum: 0,
            transactionId: reward.transactionId,
          })
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          `Curator reward broadcast failed for @${reward.author}: ${msg}`,
          'cron:curator-rewards',
          err
        );
        broadcastFailures.push({
          author: reward.author,
          curator: reward.curator,
          error: msg,
        });
      }
    }

    // Persist only the successfully broadcast rewards so retries pick up
    // the failures on the next tick. Daily counts advance only for votes
    // whose broadcast actually landed.
    if (broadcastedRewards.length > 0) {
      const persistedStats = new Map(curatorDailyCounts);
      for (const r of broadcastedRewards) {
        persistedStats.set(r.curator, (persistedStats.get(r.curator) || 0) + 1);
      }
      await saveProcessedRewards(broadcastedRewards, broadcastedVoteIds, persistedStats);
    }

    const totalRewarded = broadcastedRewards.reduce((sum, r) => sum + r.amount, 0);

    // Silence unused-var warning for updatedStats from processCuratorVotes —
    // we recompute persistedStats from actual broadcast outcomes above.
    void updatedStats;

    return NextResponse.json({
      success: true,
      message: `Broadcast ${broadcastedRewards.length} curator rewards (${broadcastFailures.length} failed)`,
      summary: {
        votesFound: allVotes.length,
        eligibleVotes: eligibleVotes.length,
        verifiedVotes: verifiedVotes.length,
        rewardsCalculated: rewards.length,
        rewardsBroadcast: broadcastedRewards.length,
        broadcastFailures: broadcastFailures.length,
        skipped: skipped.length,
        totalMedalsRewarded: totalRewarded,
        rewardPerVote: getCuratorRewardAmount(),
      },
      rewards: broadcastedRewards.map((r) => ({
        author: r.author,
        curator: r.curator,
        amount: r.amount,
        txId: r.transactionId,
      })),
      failures: broadcastFailures,
      stats: getCuratorStatsSummary(
        new Map(
          broadcastedRewards.reduce((acc, r) => {
            acc.set(r.curator, (acc.get(r.curator) || 0) + 1);
            return acc;
          }, new Map(curatorDailyCounts))
        )
      ),
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
