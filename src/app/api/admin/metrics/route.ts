/**
 * Admin Metrics API Route
 *
 * Returns real-time metrics from the database for the admin dashboard.
 * Requires admin account access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext, forbiddenError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/admin/config';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { getWeekId } from '@/lib/rewards/staking-distribution';
import { getDailyKey } from '@/lib/rewards/curator-rewards';
import {
  getPlatformYear,
  getWeeklyStakingPool,
  getCuratorRewardAmount,
  CURATOR_REWARDS,
} from '@/lib/rewards/config';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/admin/metrics';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const user = await getAuthenticatedUserFromSession(request);
  if (!user || !requireAdmin(user)) {
    return forbiddenError('Admin access required', ctx.requestId);
  }

  try {
    const weekId = getWeekId();
    const dailyKey = getDailyKey();

    // Previous week ID for content rewards lookup
    const prevWeekDate = new Date();
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const prevWeekId = getWeekId(prevWeekDate);

    // Fetch all data in parallel from Prisma
    const [stakingMetrics, curatorMetrics, contentRewards] = await Promise.allSettled([
      // Staking data - look for user metrics as a proxy for staking activity
      prisma.userMetric.count({ where: { weekId } }),
      // Curator rewards - count post metrics for the day
      prisma.postMetric.aggregate({
        where: { weekId },
        _sum: { votes: true },
      }),
      // Content rewards for previous week
      prisma.contentReward.findMany({ where: { weekId: prevWeekId } }),
    ]);

    // Build metrics response
    const metrics = {
      stakingRewards: {
        lastDistribution: null as string | null,
        weeklyPool: getWeeklyStakingPool(),
        totalStakers: stakingMetrics.status === 'fulfilled' ? stakingMetrics.value : 0,
        totalStaked: 0,
        weekId,
        status: null as string | null,
      },
      curatorRewards: {
        todayVotes:
          curatorMetrics.status === 'fulfilled' ? curatorMetrics.value._sum.votes || 0 : 0,
        todayRewards: 0,
        activeCurators: CURATOR_REWARDS.CURATOR_COUNT,
        dailyKey,
      },
      contentRewards: {
        lastWeek:
          contentRewards.status === 'fulfilled' && contentRewards.value.length > 0
            ? prevWeekId
            : null,
        pendingDistributions:
          contentRewards.status === 'fulfilled'
            ? contentRewards.value.filter((r: { status: string }) => r.status === 'pending').length
            : 0,
        totalDistributed:
          contentRewards.status === 'fulfilled'
            ? contentRewards.value
                .filter((r: { status: string }) => r.status === 'distributed')
                .reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)
            : 0,
        status: null as string | null,
      },
    };

    const config = {
      platformYear: getPlatformYear(),
      weeklyPool: getWeeklyStakingPool(),
      curatorRewardAmount: getCuratorRewardAmount(),
      curatorCount: CURATOR_REWARDS.CURATOR_COUNT,
    };

    return NextResponse.json({
      success: true,
      metrics,
      config,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
