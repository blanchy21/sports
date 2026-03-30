/**
 * Staking Rewards Cron Job
 *
 * Runs weekly (Sunday midnight UTC) to distribute MEDALS staking rewards.
 * Vercel Cron: "0 0 * * 0"
 *
 * This endpoint:
 * 1. Fetches all MEDALS stakers from Hive Engine
 * 2. Calculates 10% APR rewards (excluding founders)
 * 3. Stores distribution record
 * 4. Auto-broadcasts transfers from @sportsblock when SPORTSBLOCK_ACTIVE_KEY is set
 */

import { NextResponse } from 'next/server';
import { PrivateKey } from '@hiveio/dhive';
import {
  calculateStakingRewards,
  getWeekId,
  getRewardsAccount,
  validateRewardsBalance,
  buildRewardTransferOperations,
  chunkArray,
  type StakerInfo,
  type DistributionResult,
} from '@/lib/rewards/staking-distribution';
import { getHiveEngineClient } from '@/lib/hive-engine/client';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { verifyCronRequest } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';
import { getDhiveClient } from '@/lib/hive/dhive-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Max transfers per custom_json payload (Hive Engine processes arrays).
 * Each batch becomes a single custom_json op, so we stay well under the
 * 5 custom_json-per-block-per-account limit.
 */
const TRANSFERS_PER_BATCH = 25;

/** Delay between batches to land in separate blocks (ms). Hive blocks are 3s. */
const BATCH_DELAY_MS = 4000;

const dhive = getDhiveClient();

/**
 * Check if rewards have already been processed for this week
 */
async function isAlreadyProcessed(weekId: string): Promise<boolean> {
  try {
    const record = await prisma.analyticsEvent.findUnique({
      where: { eventType: `staking-${weekId}` },
    });
    return !!record;
  } catch (error) {
    logger.error('Error checking processed status', 'cron:staking-rewards', error);
    // Fail safe: assume already processed to prevent double-processing
    return true;
  }
}

/**
 * Store distribution record in database
 */
async function storeDistributionRecord(
  result: DistributionResult,
  status: 'pending' | 'completed' | 'failed',
  error?: string
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: `staking-${result.weekId}`,
        metadata: {
          type: 'staking',
          weekId: result.weekId,
          apr: result.apr,
          weeklyPool: result.weeklyPool,
          totalStaked: result.totalStaked,
          stakerCount: result.stakerCount,
          eligibleStakerCount: result.eligibleStakerCount,
          distributionCount: result.distributions.length,
          totalDistributed: result.distributions.reduce((sum, d) => sum + d.amount, 0),
          status,
          error: error || null,
          createdAt: result.timestamp.toISOString(),
          updatedAt: new Date().toISOString(),
          // Store all distributions for retry correctness; top 10 separately for dashboard display
          distributions: result.distributions as unknown as Prisma.InputJsonValue,
          topDistributions: result.distributions.slice(0, 10) as unknown as Prisma.InputJsonValue,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (dbError) {
    logger.error('Error storing distribution record', 'cron:staking-rewards', dbError);
    throw dbError;
  }
}

/**
 * Update existing distribution record status
 */
async function updateDistributionStatus(
  weekId: string,
  status: 'completed' | 'failed',
  error?: string
): Promise<void> {
  try {
    const eventType = `staking-${weekId}`;
    const record = await prisma.analyticsEvent.findUnique({
      where: { eventType },
    });
    if (record) {
      const metadata = (record.metadata as Record<string, unknown>) || {};
      await prisma.analyticsEvent.update({
        where: { eventType },
        data: {
          metadata: {
            ...metadata,
            status,
            error: error || null,
            updatedAt: new Date().toISOString(),
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  } catch (dbError) {
    logger.error('Error updating distribution status', 'cron:staking-rewards', dbError);
  }
}

/**
 * Fetch all MEDALS stakers from Hive Engine
 */
async function fetchAllStakers(): Promise<StakerInfo[]> {
  const stakers: StakerInfo[] = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    try {
      // Query Hive Engine for staked balances
      const result = await getHiveEngineClient().find<{
        account: string;
        stake: string;
      }>(
        'tokens',
        'balances',
        {
          symbol: 'MEDALS',
          stake: { $gt: '0' },
        },
        { limit, offset }
      );

      if (!result || result.length === 0) {
        hasMore = false;
        break;
      }

      for (const balance of result) {
        const staked = parseFloat(balance.stake || '0');
        if (staked > 0) {
          stakers.push({
            account: balance.account,
            staked,
          });
        }
      }

      offset += limit;
      hasMore = result.length === limit;
    } catch (error) {
      logger.error('Error fetching stakers', 'cron:staking-rewards', error, { offset });
      throw new Error(`Failed to fetch stakers at offset ${offset}`);
    }
  }

  return stakers;
}

/**
 * Broadcast reward transfers in batches via Hive custom_json.
 *
 * Each batch bundles up to TRANSFERS_PER_BATCH transfers into a **single**
 * custom_json operation using a JSON array payload. Hive Engine processes
 * array payloads atomically. This avoids the 5-custom_json-per-block limit
 * that caused failures when we sent one custom_json per transfer.
 */
async function broadcastRewards(
  distributionResult: DistributionResult,
  activeKey: PrivateKey
): Promise<{ batchesSent: number; totalTransfers: number }> {
  const rewardsAccount = getRewardsAccount();
  const transferPayloads = buildRewardTransferOperations(
    distributionResult.distributions,
    `Staking reward ${distributionResult.weekId} (10% APR)`
  );

  if (transferPayloads.length === 0) {
    return { batchesSent: 0, totalTransfers: 0 };
  }

  const batches = chunkArray(transferPayloads, TRANSFERS_PER_BATCH);
  let batchesSent = 0;

  for (const batch of batches) {
    // Single custom_json op with an array of transfer payloads
    const op = [
      'custom_json',
      {
        id: 'ssc-mainnet-hive',
        required_auths: [rewardsAccount],
        required_posting_auths: [] as string[],
        json: JSON.stringify(batch),
      },
    ];

    logger.info(
      `Broadcasting batch ${batchesSent + 1}/${batches.length} (${batch.length} transfers)`,
      'cron:staking-rewards'
    );

    await dhive.broadcast.sendOperations([op] as never[], activeKey);
    batchesSent++;

    // Wait between batches so they land in different blocks
    if (batchesSent < batches.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return { batchesSent, totalTransfers: transferPayloads.length };
}

/**
 * Core staking rewards processing logic.
 * Fetches stakers, calculates rewards, validates balance, and stores the result.
 */
async function processStakingRewards(options: { forceRecalculate?: boolean }): Promise<{
  weekId: string;
  skipped?: boolean;
  distributionResult?: DistributionResult;
  totalToDistribute?: number;
  balanceCheck?: { valid: boolean; message: string };
}> {
  const weekId = getWeekId();

  // Check idempotency - don't process twice (unless forcing)
  if (!options.forceRecalculate && (await isAlreadyProcessed(weekId))) {
    return { weekId, skipped: true };
  }

  // Fetch all stakers
  logger.info(`Fetching stakers for ${weekId}`, 'cron:staking-rewards');
  const stakers = await fetchAllStakers();
  logger.info(`Found ${stakers.length} stakers`, 'cron:staking-rewards');

  // Calculate rewards (APR-based, founders excluded)
  const distributionResult = calculateStakingRewards(stakers);
  logger.info(
    `Calculated rewards: ${distributionResult.eligibleStakerCount} eligible, ` +
      `${distributionResult.weeklyPool} MEDALS pool (${distributionResult.apr}% APR)`,
    'cron:staking-rewards'
  );

  // Check rewards account balance
  const rewardsAccount = getRewardsAccount();
  const rewardsBalanceResult = await getHiveEngineClient().findOne<{
    balance: string;
  }>('tokens', 'balances', { account: rewardsAccount, symbol: 'MEDALS' });
  const rewardsBalance = rewardsBalanceResult ? parseFloat(rewardsBalanceResult.balance) : 0;
  const totalToDistribute = distributionResult.distributions.reduce((sum, d) => sum + d.amount, 0);

  const balanceCheck = validateRewardsBalance(rewardsBalance, totalToDistribute);

  if (!balanceCheck.valid) {
    logger.warn(balanceCheck.message, 'cron:staking-rewards');
    await storeDistributionRecord(distributionResult, 'pending', balanceCheck.message);
  } else {
    await storeDistributionRecord(distributionResult, 'pending');
  }

  return { weekId, distributionResult, totalToDistribute, balanceCheck };
}

/**
 * GET handler for staking rewards cron (auto-run by Vercel Cron)
 *
 * Calculates rewards and auto-broadcasts if SPORTSBLOCK_ACTIVE_KEY is set.
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Verify request authorization
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processStakingRewards({ forceRecalculate: false });

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        message: `Staking rewards already processed for ${result.weekId}`,
        weekId: result.weekId,
        skipped: true,
      });
    }

    const { distributionResult, totalToDistribute, balanceCheck, weekId } = result;

    if (balanceCheck && !balanceCheck.valid) {
      return NextResponse.json({
        success: true,
        message: 'Distribution calculated but insufficient balance for auto-execution',
        weekId,
        result: {
          apr: distributionResult!.apr,
          weeklyPool: distributionResult!.weeklyPool,
          totalStaked: distributionResult!.totalStaked,
          eligibleStakers: distributionResult!.eligibleStakerCount,
          totalToDistribute,
          balanceCheck,
        },
        status: 'pending',
        duration: Date.now() - startTime,
      });
    }

    // Auto-broadcast if key is available
    const activeKeyStr = process.env.SPORTSBLOCK_ACTIVE_KEY;
    if (activeKeyStr && distributionResult) {
      try {
        const activeKey = PrivateKey.fromString(activeKeyStr);
        const broadcastResult = await broadcastRewards(distributionResult, activeKey);
        await updateDistributionStatus(weekId, 'completed');

        logger.info(
          `Broadcast complete: ${broadcastResult.totalTransfers} transfers in ${broadcastResult.batchesSent} batches`,
          'cron:staking-rewards'
        );

        return NextResponse.json({
          success: true,
          message: `Staking rewards distributed for ${weekId}`,
          weekId,
          result: {
            apr: distributionResult.apr,
            weeklyPool: distributionResult.weeklyPool,
            totalStaked: distributionResult.totalStaked,
            stakerCount: distributionResult.stakerCount,
            eligibleStakers: distributionResult.eligibleStakerCount,
            totalToDistribute,
            broadcast: broadcastResult,
          },
          status: 'completed',
          duration: Date.now() - startTime,
        });
      } catch (broadcastError) {
        const errMsg =
          broadcastError instanceof Error ? broadcastError.message : 'Broadcast failed';
        logger.error('Broadcast failed', 'cron:staking-rewards', broadcastError);
        await updateDistributionStatus(weekId, 'failed', errMsg);

        return NextResponse.json(
          {
            success: false,
            message: 'Rewards calculated but broadcast failed',
            weekId,
            error: errMsg,
            status: 'failed',
            duration: Date.now() - startTime,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Staking rewards calculated for ${weekId} (no active key — pending manual broadcast)`,
      weekId,
      result: {
        apr: distributionResult!.apr,
        weeklyPool: distributionResult!.weeklyPool,
        totalStaked: distributionResult!.totalStaked,
        stakerCount: distributionResult!.stakerCount,
        eligibleStakers: distributionResult!.eligibleStakerCount,
        totalToDistribute,
        topRecipients: distributionResult!.distributions.slice(0, 10).map((d) => ({
          account: d.account,
          amount: d.amount,
          percentage: d.percentage,
        })),
      },
      status: 'pending',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Staking rewards cron failed', 'cron:staking-rewards', error);

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
 * Retry broadcasting a previously failed distribution using stored data.
 * Reconstructs the DistributionResult from the DB record and re-broadcasts.
 */
async function retryFailedBroadcast(weekId: string, activeKey: PrivateKey) {
  const eventType = `staking-${weekId}`;
  const record = await prisma.analyticsEvent.findUnique({ where: { eventType } });

  if (!record) {
    return { error: `No distribution record found for ${weekId}`, status: 404 as const };
  }

  const metadata = record.metadata as Record<string, unknown>;
  if (metadata.status === 'completed') {
    return { error: `Distribution ${weekId} already completed`, status: 400 as const };
  }

  const distributions =
    (metadata.distributions as Array<{ account: string; amount: number; percentage: number }>) ||
    // Fallback for records stored before the fix (only had top 100)
    (metadata.topDistributions as Array<{ account: string; amount: number; percentage: number }>) ||
    [];
  if (distributions.length === 0) {
    return { error: `No distributions found in record for ${weekId}`, status: 400 as const };
  }

  // Rebuild minimal DistributionResult for broadcast
  const distributionResult: DistributionResult = {
    weeklyPool: metadata.weeklyPool as number,
    totalStaked: metadata.totalStaked as number,
    stakerCount: metadata.stakerCount as number,
    eligibleStakerCount: metadata.eligibleStakerCount as number,
    distributions,
    timestamp: new Date(metadata.createdAt as string),
    weekId,
    apr: metadata.apr as number,
  };

  const broadcastResult = await broadcastRewards(distributionResult, activeKey);
  await updateDistributionStatus(weekId, 'completed');

  return {
    success: true,
    weekId,
    totalToDistribute: distributions.reduce((sum, d) => sum + d.amount, 0),
    distributionResult,
    broadcastResult,
  };
}

/**
 * POST handler for manual trigger with options.
 *
 * Body: {
 *   dryRun?: boolean (default true),
 *   forceRecalculate?: boolean,
 *   retryBroadcast?: boolean — retry broadcasting a failed week (uses stored data)
 * }
 *
 * When dryRun=false and SPORTSBLOCK_ACTIVE_KEY is set, broadcasts transfers.
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Verify request authorization
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      forceRecalculate = false,
      dryRun = true,
      retryBroadcast = false,
      weekId: requestedWeekId,
    } = body;

    // Retry path: re-broadcast a previously failed distribution
    if (retryBroadcast) {
      const activeKeyStr = process.env.SPORTSBLOCK_ACTIVE_KEY;
      if (!activeKeyStr) {
        return NextResponse.json(
          { success: false, message: 'SPORTSBLOCK_ACTIVE_KEY not configured' },
          { status: 400 }
        );
      }

      const weekId = requestedWeekId || getWeekId();
      const activeKey = PrivateKey.fromString(activeKeyStr);
      const retryResult = await retryFailedBroadcast(weekId, activeKey);

      if ('error' in retryResult) {
        return NextResponse.json(
          { success: false, error: retryResult.error },
          { status: retryResult.status }
        );
      }

      logger.info(
        `Retry broadcast complete: ${retryResult.broadcastResult.totalTransfers} transfers in ${retryResult.broadcastResult.batchesSent} batches`,
        'cron:staking-rewards'
      );

      return NextResponse.json({
        success: true,
        message: `Retry broadcast completed for ${weekId}`,
        weekId,
        result: {
          totalToDistribute: retryResult.totalToDistribute,
          broadcast: retryResult.broadcastResult,
        },
        status: 'completed',
        retried: true,
        duration: Date.now() - startTime,
      });
    }

    const result = await processStakingRewards({ forceRecalculate });

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        message: `Staking rewards already processed for ${result.weekId}`,
        weekId: result.weekId,
        skipped: true,
      });
    }

    const { distributionResult, totalToDistribute, weekId } = result;

    // Broadcast if not dry run and key is available
    if (!dryRun && distributionResult) {
      const activeKeyStr = process.env.SPORTSBLOCK_ACTIVE_KEY;
      if (!activeKeyStr) {
        return NextResponse.json(
          {
            success: false,
            message: 'SPORTSBLOCK_ACTIVE_KEY not configured — cannot broadcast',
            weekId,
            status: 'pending',
            duration: Date.now() - startTime,
          },
          { status: 400 }
        );
      }

      try {
        const activeKey = PrivateKey.fromString(activeKeyStr);
        const broadcastResult = await broadcastRewards(distributionResult, activeKey);
        await updateDistributionStatus(weekId, 'completed');

        return NextResponse.json({
          success: true,
          message: `Staking rewards distributed for ${weekId}`,
          weekId,
          result: {
            apr: distributionResult.apr,
            weeklyPool: distributionResult.weeklyPool,
            totalStaked: distributionResult.totalStaked,
            stakerCount: distributionResult.stakerCount,
            eligibleStakers: distributionResult.eligibleStakerCount,
            totalToDistribute,
            broadcast: broadcastResult,
          },
          status: 'completed',
          dryRun: false,
          duration: Date.now() - startTime,
        });
      } catch (broadcastError) {
        const errMsg =
          broadcastError instanceof Error ? broadcastError.message : 'Broadcast failed';
        logger.error('Broadcast failed', 'cron:staking-rewards', broadcastError);
        await updateDistributionStatus(weekId, 'failed', errMsg);

        return NextResponse.json(
          {
            success: false,
            message: 'Rewards calculated but broadcast failed',
            weekId,
            error: errMsg,
            status: 'failed',
            duration: Date.now() - startTime,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Staking rewards calculated for ${weekId}`,
      weekId,
      result: {
        apr: distributionResult!.apr,
        weeklyPool: distributionResult!.weeklyPool,
        totalStaked: distributionResult!.totalStaked,
        stakerCount: distributionResult!.stakerCount,
        eligibleStakers: distributionResult!.eligibleStakerCount,
        totalToDistribute,
        topRecipients: distributionResult!.distributions.slice(0, 10).map((d) => ({
          account: d.account,
          amount: d.amount,
          percentage: d.percentage,
        })),
      },
      status: 'pending',
      dryRun,
      note: 'Dry run — no tokens transferred. Set dryRun: false to execute.',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Staking rewards POST failed', 'cron:staking-rewards', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Staking rewards processing failed',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
