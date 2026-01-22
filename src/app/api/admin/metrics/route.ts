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
import { db } from '@/lib/firebase/config';
import { doc, collection, getDoc } from 'firebase/firestore';

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

    if (db) {
      firebaseStatus = true;

      // Fetch staking rewards doc for current week
      try {
        const stakingRef = doc(collection(db, 'rewards'), `staking-${weekId}`);
        const stakingSnap = await getDoc(stakingRef);
        if (stakingSnap.exists()) {
          stakingData = stakingSnap.data();
        }
      } catch (e) {
        ctx.log.warn('Failed to fetch staking data', { error: String(e) });
      }

      // Fetch curator rewards doc for today
      try {
        const curatorRef = doc(collection(db, 'curator-rewards'), dailyKey);
        const curatorSnap = await getDoc(curatorRef);
        if (curatorSnap.exists()) {
          curatorData = curatorSnap.data();
        }
      } catch (e) {
        ctx.log.warn('Failed to fetch curator data', { error: String(e) });
      }

      // Fetch weekly content rewards for previous week
      try {
        const contentRef = doc(collection(db, 'weekly-rewards-processed'), prevWeekId);
        const contentSnap = await getDoc(contentRef);
        if (contentSnap.exists()) {
          contentData = contentSnap.data();
        }
      } catch (e) {
        ctx.log.warn('Failed to fetch content rewards data', { error: String(e) });
      }
    }

    // Build metrics response
    const metrics = {
      stakingRewards: {
        lastDistribution: stakingData?.createdAt
          ? new Date(
              (stakingData.createdAt as { seconds: number }).seconds * 1000
            ).toISOString()
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
