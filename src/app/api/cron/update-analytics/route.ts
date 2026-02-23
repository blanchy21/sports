import { NextResponse } from 'next/server';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';
import { getAnalyticsData } from '@/lib/hive-workerbee/analytics';
import { fetchSportsbites } from '@/lib/hive-workerbee/sportsbites';
import { fetchSoftSportsbites } from '@/lib/hive-workerbee/sportsbites-server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Helper to upsert an analytics event by eventType.
 * Deletes old records with the same eventType and creates a fresh one.
 */
async function upsertAnalytics(eventType: string, metadata: Record<string, unknown>) {
  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({ where: { eventType } }),
    prisma.analyticsEvent.create({
      data: { eventType, metadata: metadata as Prisma.InputJsonValue },
    }),
  ]);
}

/**
 * Cron endpoint for updating analytics in the database
 * This endpoint is called by Vercel Cron Jobs or other scheduled services
 */
export async function GET() {
  // Verify cron authentication
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  try {
    logger.info('Starting analytics update', 'cron:update-analytics');

    // Fetch posts, Hive sportsbites, and soft sportsbites in parallel
    const [result, bitesResult, softBites] = await Promise.all([
      fetchSportsblockPosts({ limit: 500, sort: 'created' }),
      fetchSportsbites({ limit: 500 }),
      fetchSoftSportsbites({ limit: 500 }),
    ]);

    const allBites = [...bitesResult.sportsbites, ...softBites];

    if (result.posts.length === 0 && allBites.length === 0) {
      logger.info('No posts or sportsbites found, skipping update', 'cron:update-analytics');
      return NextResponse.json({
        success: true,
        message: 'No posts to analyze',
        postsCount: 0,
      });
    }

    logger.info(
      `Fetched ${result.posts.length} posts, ${bitesResult.sportsbites.length} hive bites, ${softBites.length} soft bites, calculating analytics`,
      'cron:update-analytics'
    );

    // Calculate analytics -- sportsbites (hive + soft) drive trending topics
    const analytics = await getAnalyticsData(result.posts, undefined, allBites);
    const now = new Date().toISOString();

    // Update database -- delete old + create new for each analytics type
    await Promise.all([
      upsertAnalytics('trendingSports', {
        sports: analytics.trendingSports,
        lastUpdated: now,
        version: 1,
      }),
      upsertAnalytics('trendingTopics', {
        topics: analytics.trendingTopics,
        lastUpdated: now,
        version: 1,
      }),
      upsertAnalytics('topAuthors', {
        authors: analytics.topAuthors,
        lastUpdated: now,
        version: 1,
      }),
      upsertAnalytics('communityStats', {
        totalPosts: analytics.communityStats.totalPosts,
        totalAuthors: analytics.communityStats.totalAuthors,
        totalRewards: analytics.communityStats.totalRewards,
        activeToday: analytics.communityStats.activeToday,
        lastUpdated: now,
        version: 1,
      }),
    ]);

    logger.info('Analytics update completed successfully', 'cron:update-analytics');

    return NextResponse.json({
      success: true,
      message: 'Analytics updated successfully',
      data: {
        postsAnalyzed: result.posts.length,
        trendingSports: analytics.trendingSports.length,
        trendingTopics: analytics.trendingTopics.length,
        topAuthors: analytics.topAuthors.length,
        communityStats: analytics.communityStats,
      },
    });
  } catch (error) {
    logger.error('Error updating analytics', 'cron:update-analytics', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
