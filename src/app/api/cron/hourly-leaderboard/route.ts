/**
 * Hourly Leaderboard Update Cron
 *
 * Regenerates current week's leaderboard standings every hour
 * so the /leaderboard page shows near-real-time rankings.
 *
 * No reward calculation — that's weekly only (weekly-rewards cron).
 * Upsert is inherently idempotent, no special guard needed.
 *
 * Vercel Cron: "0 * * * *"
 */

import { NextResponse } from 'next/server';
import { generateWeeklyLeaderboards, getCurrentWeekId } from '@/lib/metrics/leaderboard';
import { verifyCronRequest } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const startTime = Date.now();

  try {
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekId = getCurrentWeekId();
    logger.info(`Regenerating leaderboards for ${weekId}`, 'cron:hourly-leaderboard');

    const leaderboards = await generateWeeklyLeaderboards(weekId);

    const categorySummary = Object.entries(leaderboards.leaderboards).map(
      ([category, entries]) => ({
        category,
        entries: entries.length,
        top: entries[0] ? { account: entries[0].account, value: entries[0].value } : null,
      })
    );

    return NextResponse.json({
      success: true,
      weekId,
      generatedAt: leaderboards.generatedAt,
      categories: categorySummary,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Hourly leaderboard cron failed', 'cron:hourly-leaderboard', error);

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
