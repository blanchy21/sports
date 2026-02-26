import { NextResponse } from 'next/server';
import {
  TrendingSport,
  TrendingTopic,
  TopAuthor,
  CommunityStats,
  getAnalyticsData,
} from '@/lib/hive-workerbee/analytics';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';
import { fetchSportsbites } from '@/lib/hive-workerbee/sportsbites';
import { fetchSoftSportsbites } from '@/lib/hive-workerbee/sportsbites-server';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };

const ROUTE = '/api/analytics';

/**
 * Analytics API endpoint
 * Fetches analytics data from the database (layer 2)
 * This data is custom to Sportsblock and not available from Hive API
 */
export async function GET() {
  const ctx = createRequestContext(ROUTE);

  try {
    const analytics = {
      trendingSports: [] as TrendingSport[],
      trendingTopics: [] as TrendingTopic[],
      topAuthors: [] as TopAuthor[],
      communityStats: {
        totalPosts: 0,
        totalAuthors: 0,
        totalRewards: 0,
        activeToday: 0,
      } as CommunityStats,
    };

    // Try to fetch cached analytics from the database
    const [trendingSportsRecord, trendingTopicsRecord, topAuthorsRecord, communityStatsRecord] =
      await Promise.allSettled([
        prisma.analyticsEvent.findFirst({
          where: { eventType: 'trendingSports' },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.analyticsEvent.findFirst({
          where: { eventType: 'trendingTopics' },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.analyticsEvent.findFirst({
          where: { eventType: 'topAuthors' },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.analyticsEvent.findFirst({
          where: { eventType: 'communityStats' },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    if (trendingSportsRecord.status === 'fulfilled' && trendingSportsRecord.value?.metadata) {
      const data = trendingSportsRecord.value.metadata as Record<string, unknown>;
      analytics.trendingSports = (data.sports || data.trendingSports || []) as TrendingSport[];
    }

    if (trendingTopicsRecord.status === 'fulfilled' && trendingTopicsRecord.value?.metadata) {
      const data = trendingTopicsRecord.value.metadata as Record<string, unknown>;
      analytics.trendingTopics = (data.topics || data.trendingTopics || []) as TrendingTopic[];
    }

    if (topAuthorsRecord.status === 'fulfilled' && topAuthorsRecord.value?.metadata) {
      const data = topAuthorsRecord.value.metadata as Record<string, unknown>;
      analytics.topAuthors = (data.authors || data.topAuthors || []) as TopAuthor[];
    }

    if (communityStatsRecord.status === 'fulfilled' && communityStatsRecord.value?.metadata) {
      const data = communityStatsRecord.value.metadata as Record<string, unknown>;
      analytics.communityStats = {
        totalPosts: (data.totalPosts as number) || 0,
        totalAuthors: (data.totalAuthors as number) || 0,
        totalRewards: (data.totalRewards as number) || 0,
        activeToday: (data.activeToday as number) || 0,
      };
    }

    // Fallback: Recompute any empty sections from Hive rather than requiring ALL to be empty
    const hasMeaningfulSportsData = analytics.trendingSports.some((s) => s.posts > 0);
    const hasMeaningfulTopicsData = analytics.trendingTopics.some((t) => t.posts > 0);
    const hasMeaningfulAuthorsData = analytics.topAuthors.length > 0;
    const hasMeaningfulStats = analytics.communityStats.totalPosts > 0;

    const needsRecompute =
      !hasMeaningfulSportsData ||
      !hasMeaningfulTopicsData ||
      !hasMeaningfulAuthorsData ||
      !hasMeaningfulStats;

    if (needsRecompute) {
      console.log('[Analytics API] Some database sections empty, computing from Hive + soft...');
      const [postsResult, bitesResult, softBites] = await Promise.all([
        fetchSportsblockPosts({ limit: 50, sort: 'created' }),
        fetchSportsbites({ limit: 200 }),
        fetchSoftSportsbites({ limit: 200 }),
      ]);
      const posts = postsResult.posts;
      const allBites = [...bitesResult.sportsbites, ...softBites];
      if (posts.length > 0 || allBites.length > 0) {
        const computedAnalytics = await getAnalyticsData(posts, undefined, allBites);
        if (!hasMeaningfulSportsData) analytics.trendingSports = computedAnalytics.trendingSports;
        if (!hasMeaningfulTopicsData) analytics.trendingTopics = computedAnalytics.trendingTopics;
        if (!hasMeaningfulAuthorsData) analytics.topAuthors = computedAnalytics.topAuthors;
        if (!hasMeaningfulStats) analytics.communityStats = computedAnalytics.communityStats;
        console.log(
          `[Analytics API] Backfilled from ${posts.length} posts, ${bitesResult.sportsbites.length} hive bites, ${softBites.length} soft bites`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: analytics,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
