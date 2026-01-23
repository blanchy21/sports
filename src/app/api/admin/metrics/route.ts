/**
 * Admin Metrics API Route
 *
 * Returns real-time metrics from Firestore for the admin dashboard.
 * Requires admin account access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestContext, forbiddenError, validationError } from '@/lib/api/response';
import { parseSearchParams } from '@/lib/api/validation';
import { isAdminAccount } from '@/lib/admin/config';
import { getWeekId } from '@/lib/rewards/staking-distribution';
import { getDailyKey, getCuratorAccounts } from '@/lib/rewards/curator-rewards';
import {
  getPlatformYear,
  getWeeklyStakingPool,
  getCuratorRewardAmount,
  CURATOR_REWARDS,
} from '@/lib/rewards/config';
import { getAdminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/admin/metrics';

const querySchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const parseResult = parseSearchParams(request.nextUrl.searchParams, querySchema);
  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username } = parseResult.data;

  if (!isAdminAccount(username)) {
    return forbiddenError('Admin access required', ctx.requestId);
  }

  try {
    const weekId = getWeekId();
    const dailyKey = getDailyKey();

    // Previous week ID for content rewards lookup
    const prevWeekDate = new Date();
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const prevWeekId = getWeekId(prevWeekDate);

    let stakingData: Record<string, unknown> | null = null;
    let curatorData: Record<string, unknown> | null = null;
    let contentData: Record<string, unknown> | null = null;
    let firebaseStatus = false;

    const adminDb = getAdminDb();
    if (adminDb) {
      firebaseStatus = true;

      // Fetch all Firestore docs in parallel
      const [stakingResult, curatorResult, contentResult] = await Promise.allSettled([
        adminDb.collection('rewards').doc(`staking-${weekId}`).get(),
        adminDb.collection('curator-rewards').doc(dailyKey).get(),
        adminDb.collection('weekly-rewards-processed').doc(prevWeekId).get(),
      ]);

      if (stakingResult.status === 'fulfilled' && stakingResult.value.exists) {
        stakingData = stakingResult.value.data() as Record<string, unknown>;
      } else if (stakingResult.status === 'rejected') {
        ctx.log.warn('Failed to fetch staking data', { error: String(stakingResult.reason) });
      }

      if (curatorResult.status === 'fulfilled' && curatorResult.value.exists) {
        curatorData = curatorResult.value.data() as Record<string, unknown>;
      } else if (curatorResult.status === 'rejected') {
        ctx.log.warn('Failed to fetch curator data', { error: String(curatorResult.reason) });
      }

      if (contentResult.status === 'fulfilled' && contentResult.value.exists) {
        contentData = contentResult.value.data() as Record<string, unknown>;
      } else if (contentResult.status === 'rejected') {
        ctx.log.warn('Failed to fetch content rewards data', { error: String(contentResult.reason) });
      }
    }

    // Build metrics response
    const metrics = {
      stakingRewards: {
        lastDistribution: stakingData?.createdAt
          ? (typeof (stakingData.createdAt as { toDate?: () => Date }).toDate === 'function'
              ? (stakingData.createdAt as { toDate: () => Date }).toDate().toISOString()
              : new Date(stakingData.createdAt as string).toISOString())
          : null,
        weeklyPool: getWeeklyStakingPool(),
        totalStakers: (stakingData?.stakerCount as number) || 0,
        totalStaked: (stakingData?.totalStaked as number) || 0,
        weekId,
        status: (stakingData?.status as string) || null,
      },
      curatorRewards: {
        todayVotes: (curatorData?.totalVotes as number) || 0,
        todayRewards: (curatorData?.totalRewards as number) || 0,
        activeCurators: CURATOR_REWARDS.CURATOR_COUNT,
        dailyKey,
      },
      contentRewards: {
        lastWeek: contentData?.weekId
          ? (contentData.weekId as string)
          : null,
        pendingDistributions: (contentData?.pending as number) || 0,
        totalDistributed: (contentData?.totalDistributed as number) || 0,
        status: (contentData?.status as string) || null,
      },
    };

    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      cronSecretSet: !!process.env.CRON_SECRET,
      curatorAccounts: getCuratorAccounts(),
      firebaseConfigured: firebaseStatus,
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
      environmentInfo,
      config,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
