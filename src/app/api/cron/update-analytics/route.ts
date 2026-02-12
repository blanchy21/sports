import { NextResponse } from 'next/server';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';
import { getAnalyticsData } from '@/lib/hive-workerbee/analytics';
import { fetchSportsbites } from '@/lib/hive-workerbee/sportsbites';
import { fetchSoftSportsbites } from '@/lib/hive-workerbee/sportsbites-server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint for updating analytics in Firestore
 * This endpoint is called by Vercel Cron Jobs or other scheduled services
 */
export async function GET() {
  // Verify cron authentication
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  try {
    // Check if Firebase is configured
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase not configured - analytics update skipped',
        },
        { status: 503 }
      );
    }

    console.log('[Cron] Starting analytics update...');

    // Fetch posts, Hive sportsbites, and soft sportsbites in parallel
    const [result, bitesResult, softBites] = await Promise.all([
      fetchSportsblockPosts({ limit: 500, sort: 'created' }),
      fetchSportsbites({ limit: 500 }),
      fetchSoftSportsbites({ limit: 500 }),
    ]);

    const allBites = [...bitesResult.sportsbites, ...softBites];

    if (result.posts.length === 0 && allBites.length === 0) {
      console.log('[Cron] No posts or sportsbites found, skipping update');
      return NextResponse.json({
        success: true,
        message: 'No posts to analyze',
        postsCount: 0,
      });
    }

    console.log(
      `[Cron] Fetched ${result.posts.length} posts, ${bitesResult.sportsbites.length} hive bites, ${softBites.length} soft bites, calculating analytics...`
    );

    // Calculate analytics — sportsbites (hive + soft) drive trending topics
    const analytics = await getAnalyticsData(result.posts, undefined, allBites);

    // Update Firestore
    await Promise.all([
      setDoc(doc(db, 'analytics', 'trendingSports'), {
        sports: analytics.trendingSports,
        lastUpdated: serverTimestamp(),
        version: 1,
      }),
      setDoc(doc(db, 'analytics', 'trendingTopics'), {
        topics: analytics.trendingTopics,
        lastUpdated: serverTimestamp(),
        version: 1,
      }),
      setDoc(doc(db, 'analytics', 'topAuthors'), {
        authors: analytics.topAuthors,
        lastUpdated: serverTimestamp(),
        version: 1,
      }),
      setDoc(doc(db, 'analytics', 'communityStats'), {
        totalPosts: analytics.communityStats.totalPosts,
        totalAuthors: analytics.communityStats.totalAuthors,
        totalRewards: analytics.communityStats.totalRewards,
        activeToday: analytics.communityStats.activeToday,
        lastUpdated: serverTimestamp(),
        version: 1,
      }),
    ]);

    console.log('[Cron] Analytics update completed successfully');

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
    console.error('[Cron] Error updating analytics:', error);
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
