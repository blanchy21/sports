/**
 * Staking Rewards Cron Job
 *
 * Runs weekly (Sunday midnight UTC) to distribute MEDALS staking rewards.
 * Vercel Cron: "0 0 * * 0"
 *
 * This endpoint:
 * 1. Fetches all MEDALS stakers from Hive Engine
 * 2. Calculates proportional rewards
 * 3. Stores distribution record for manual execution or auto-broadcast
 */

import { NextResponse } from 'next/server';
import {
  calculateStakingRewards,
  getWeekId,
  getRewardsAccount,
  validateRewardsBalance,
  type StakerInfo,
  type DistributionResult,
} from '@/lib/rewards/staking-distribution';
import { getHiveEngineClient } from '@/lib/hive-engine/client';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { verifyCronRequest } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Check if rewards have already been processed for this week
 */
async function isAlreadyProcessed(weekId: string): Promise<boolean> {
  try {
    const record = await prisma.analyticsEvent.findFirst({
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
          // Store top 100 distributions for review (full list can be large)
          topDistributions: result.distributions.slice(0, 100) as unknown as Prisma.InputJsonValue,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (dbError) {
    logger.error('Error storing distribution record', 'cron:staking-rewards', dbError);
    throw dbError;
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

  // Calculate rewards
  const distributionResult = calculateStakingRewards(stakers);
  logger.info(
    `Calculated rewards: ${distributionResult.eligibleStakerCount} eligible, ${distributionResult.weeklyPool} MEDALS pool`,
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
 * GET handler for staking rewards cron
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

    return NextResponse.json({
      success: true,
      message: `Staking rewards calculated for ${weekId}`,
      weekId,
      result: {
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
 * POST handler for manual trigger with options
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Verify request authorization
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { forceRecalculate = false, dryRun = true } = body;

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

    return NextResponse.json({
      success: true,
      message: `Staking rewards calculated for ${weekId}`,
      weekId,
      result: {
        weeklyPool: distributionResult!.weeklyPool,
        totalStaked: distributionResult!.totalStaked,
        stakerCount: distributionResult!.stakerCount,
        eligibleStakers: distributionResult!.eligibleStakerCount,
        totalToDistribute,
      },
      status: 'pending',
      dryRun,
      note: dryRun
        ? 'Dry run - no tokens transferred. Set dryRun: false to execute.'
        : 'Tokens would be transferred (not implemented yet - requires hot wallet)',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Staking rewards POST failed', 'cron:staking-rewards', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
