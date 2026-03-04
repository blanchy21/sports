/**
 * Monthly Leaderboard Cron
 *
 * Runs on the 1st of each month at 02:00 UTC.
 * Generates the previous month's leaderboards and assigns monthly title badges.
 *
 * Vercel Cron: "0 2 1 * *"
 */

import { NextResponse } from 'next/server';
import {
  generateMonthlyLeaderboards,
  getMonthId,
  getPreviousMonthId,
} from '@/lib/metrics/monthly-leaderboard';
import { assignMonthlyTitles } from '@/lib/badges/monthly-titles';
import { verifyCronRequest } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const startTime = Date.now();

  try {
    if (!(await verifyCronRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Previous month (this cron runs on the 1st of the new month)
    const currentMonthId = getMonthId();
    const monthId = getPreviousMonthId(currentMonthId);

    logger.info(`Generating monthly leaderboards for ${monthId}`, 'cron:monthly-leaderboard');

    // Idempotency: check if already generated via analytics event
    const existing = await prisma.analyticsEvent.findFirst({
      where: {
        eventType: 'monthly_leaderboard_generated',
        metadata: { path: ['monthId'], equals: monthId },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        monthId,
        skipped: true,
        reason: 'Already generated',
        duration: Date.now() - startTime,
      });
    }

    // Generate leaderboards
    const result = await generateMonthlyLeaderboards(monthId);

    // Assign monthly title badges
    const titles = await assignMonthlyTitles(monthId);

    // Record analytics event for idempotency
    await prisma.analyticsEvent.create({
      data: {
        eventType: 'monthly_leaderboard_generated',
        metadata: {
          monthId,
          overallEntries: result.overall.length,
          sportCount: Object.keys(result.perSport).length,
          titlesAwarded: titles.length,
          titles: titles.map((t) => ({ sport: t.sportId, user: t.username })),
        },
      },
    });

    logger.info(
      `Monthly leaderboard complete: ${result.overall.length} overall entries, ` +
        `${Object.keys(result.perSport).length} sports, ${titles.length} titles`,
      'cron:monthly-leaderboard'
    );

    return NextResponse.json({
      success: true,
      monthId,
      overallEntries: result.overall.length,
      sportCount: Object.keys(result.perSport).length,
      titlesAwarded: titles.length,
      titles: titles.map((t) => ({ sport: t.sportId, user: t.username, score: t.score })),
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Monthly leaderboard cron failed', 'cron:monthly-leaderboard', error);

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
