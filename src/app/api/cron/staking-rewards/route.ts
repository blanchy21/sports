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
    console.error('Error checking processed status:', error);
    return false;
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
    console.error('Error storing distribution record:', dbError);
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
      console.error('Error fetching stakers:', error);
      throw new Error(`Failed to fetch stakers at offset ${offset}`);
    }
  }

  return stakers;
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

    const weekId = getWeekId();

    // Check idempotency - don't process twice
    if (await isAlreadyProcessed(weekId)) {
      return NextResponse.json({
        success: true,
        message: `Staking rewards already processed for ${weekId}`,
        weekId,
        skipped: true,
      });
    }

    // Fetch all stakers
    console.log(`[Staking Rewards] Fetching stakers for ${weekId}...`);
    const stakers = await fetchAllStakers();
    console.log(`[Staking Rewards] Found ${stakers.length} stakers`);

    // Calculate rewards
    const distributionResult = calculateStakingRewards(stakers);
    console.log(
      `[Staking Rewards] Calculated rewards: ${distributionResult.eligibleStakerCount} eligible, ` +
        `${distributionResult.weeklyPool} MEDALS pool`
    );

    // Check rewards account balance
    const rewardsAccount = getRewardsAccount();
    const rewardsBalanceResult = await getHiveEngineClient().findOne<{
      balance: string;
    }>('tokens', 'balances', { account: rewardsAccount, symbol: 'MEDALS' });
    const rewardsBalance = rewardsBalanceResult ? parseFloat(rewardsBalanceResult.balance) : 0;
    const totalToDistribute = distributionResult.distributions.reduce(
      (sum, d) => sum + d.amount,
      0
    );

    const balanceCheck = validateRewardsBalance(rewardsBalance, totalToDistribute);

    if (!balanceCheck.valid) {
      console.warn(`[Staking Rewards] ${balanceCheck.message}`);
      await storeDistributionRecord(distributionResult, 'pending', balanceCheck.message);

      return NextResponse.json({
        success: true,
        message: 'Distribution calculated but insufficient balance for auto-execution',
        weekId,
        result: {
          weeklyPool: distributionResult.weeklyPool,
          totalStaked: distributionResult.totalStaked,
          eligibleStakers: distributionResult.eligibleStakerCount,
          totalToDistribute,
          balanceCheck,
        },
        status: 'pending',
        duration: Date.now() - startTime,
      });
    }

    // Store as pending (manual execution or separate broadcast job)
    await storeDistributionRecord(distributionResult, 'pending');

    return NextResponse.json({
      success: true,
      message: `Staking rewards calculated for ${weekId}`,
      weekId,
      result: {
        weeklyPool: distributionResult.weeklyPool,
        totalStaked: distributionResult.totalStaked,
        stakerCount: distributionResult.stakerCount,
        eligibleStakers: distributionResult.eligibleStakerCount,
        totalToDistribute,
        topRecipients: distributionResult.distributions.slice(0, 10).map((d) => ({
          account: d.account,
          amount: d.amount,
          percentage: d.percentage,
        })),
      },
      status: 'pending',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Staking Rewards] Error:', error);

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
  try {
    // Verify request authorization
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { forceRecalculate = false, dryRun = true } = body;

    const weekId = getWeekId();

    // Check if already processed (unless forcing)
    if (!forceRecalculate && (await isAlreadyProcessed(weekId))) {
      return NextResponse.json({
        success: true,
        message: `Staking rewards already processed for ${weekId}`,
        weekId,
        skipped: true,
      });
    }

    // For now, POST just triggers the same calculation as GET
    const response = await GET();
    const data = await response.json();

    return NextResponse.json({
      ...data,
      dryRun,
      note: dryRun
        ? 'Dry run - no tokens transferred. Set dryRun: false to execute.'
        : 'Tokens would be transferred (not implemented yet - requires hot wallet)',
    });
  } catch (error) {
    console.error('[Staking Rewards POST] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
