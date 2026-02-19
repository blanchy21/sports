/**
 * Weekly Content Rewards Cron Job
 *
 * Runs every Monday at midnight UTC to:
 * 1. Generate leaderboards from the previous week's metrics
 * 2. Calculate content reward distributions
 * 3. Store pending rewards for admin review/distribution
 *
 * Vercel Cron: "0 0 * * 1"
 */

import { NextResponse } from 'next/server';
import { getWeekId } from '@/lib/rewards/staking-distribution';
import {
  generateWeeklyLeaderboards,
  calculateContentRewards,
  storeRewardDistributions,
  getLeaderboards,
} from '@/lib/metrics/leaderboard';
import { getPlatformYear } from '@/lib/rewards/config';
import { prisma } from '@/lib/db/prisma';
import { verifyCronRequest } from '@/lib/api/cron-auth';

/**
 * Get the previous week's ID (since we run on Monday for the previous week)
 */
function getPreviousWeekId(): string {
  const now = new Date();
  // Go back 7 days to get to the previous week
  const previousWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return getWeekId(previousWeek);
}

/**
 * Check if rewards have already been processed for this week
 */
async function isAlreadyProcessed(weekId: string): Promise<boolean> {
  try {
    const record = await prisma.analyticsEvent.findFirst({
      where: { eventType: `weekly-rewards-${weekId}` },
    });
    return !!record;
  } catch (error) {
    console.error('Error checking processed status:', error);
    return false;
  }
}

/**
 * Mark the week as processed
 */
async function markAsProcessed(weekId: string, summary: Record<string, unknown>): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: `weekly-rewards-${weekId}`,
        metadata: {
          weekId,
          processedAt: new Date().toISOString(),
          ...summary,
        },
      },
    });
  } catch (error) {
    console.error('Error marking as processed:', error);
  }
}

/**
 * GET handler for weekly rewards cron
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Verify request authorization
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekId = getPreviousWeekId();

    // Check idempotency
    if (await isAlreadyProcessed(weekId)) {
      return NextResponse.json({
        success: true,
        message: `Weekly rewards already processed for ${weekId}`,
        weekId,
        skipped: true,
      });
    }

    console.log(`[Weekly Rewards] Processing rewards for ${weekId}...`);

    // Generate leaderboards from metrics
    console.log('[Weekly Rewards] Generating leaderboards...');
    const leaderboards = await generateWeeklyLeaderboards(weekId);

    // Calculate reward distributions
    console.log('[Weekly Rewards] Calculating reward distributions...');
    const distributions = calculateContentRewards(leaderboards);

    // Store distributions for admin review
    if (distributions.length > 0) {
      console.log(`[Weekly Rewards] Storing ${distributions.length} reward distributions...`);
      await storeRewardDistributions(distributions);
    }

    // Calculate totals
    const totalRewards = distributions.reduce((sum, d) => sum + d.amount, 0);
    const platformYear = getPlatformYear();

    const summary = {
      weekId,
      platformYear,
      leaderboardCategories: Object.keys(leaderboards.leaderboards).length,
      distributionsCreated: distributions.length,
      totalMedalsToDistribute: totalRewards,
      distributions: distributions.map((d) => ({
        category: d.category,
        winner: d.winner.account,
        amount: d.amount,
        postId: d.winner.postId,
      })),
      leaderboardSummary: Object.entries(leaderboards.leaderboards).map(([category, entries]) => ({
        category,
        entriesCount: entries.length,
        topEntry: entries[0]
          ? {
              account: entries[0].account,
              value: entries[0].value,
            }
          : null,
      })),
    };

    // Mark as processed
    await markAsProcessed(weekId, summary);

    console.log(`[Weekly Rewards] Completed. ${distributions.length} rewards pending.`);

    return NextResponse.json({
      success: true,
      message: `Weekly rewards calculated for ${weekId}`,
      ...summary,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Weekly Rewards] Error:', error);

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
 * POST handler for manual trigger
 */
export async function POST(request: Request) {
  try {
    // Verify request authorization
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { weekId, forceRegenerate = false } = body;

    const targetWeekId = weekId || getPreviousWeekId();

    // Check if already processed (unless forcing)
    if (!forceRegenerate && (await isAlreadyProcessed(targetWeekId))) {
      // Return existing data
      const existingLeaderboards = await getLeaderboards(targetWeekId);

      return NextResponse.json({
        success: true,
        message: `Weekly rewards already processed for ${targetWeekId}`,
        weekId: targetWeekId,
        skipped: true,
        leaderboards: existingLeaderboards,
      });
    }

    // Generate leaderboards
    const leaderboards = await generateWeeklyLeaderboards(targetWeekId);
    const distributions = calculateContentRewards(leaderboards);

    if (distributions.length > 0) {
      await storeRewardDistributions(distributions);
    }

    return NextResponse.json({
      success: true,
      message: `Weekly rewards regenerated for ${targetWeekId}`,
      weekId: targetWeekId,
      leaderboards,
      distributions: distributions.map((d) => ({
        category: d.category,
        winner: d.winner.account,
        amount: d.amount,
      })),
      forceRegenerate,
    });
  } catch (error) {
    console.error('[Weekly Rewards POST] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
