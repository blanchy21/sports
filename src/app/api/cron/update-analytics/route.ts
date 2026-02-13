import { NextResponse } from 'next/server';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';
import { getAnalyticsData } from '@/lib/hive-workerbee/analytics';
import { fetchSportsbites } from '@/lib/hive-workerbee/sportsbites';
import { fetchSoftSportsbites } from '@/lib/hive-workerbee/sportsbites-server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint for updating analytics in Firestore
 * This endpoint is called by Vercel Cron Jobs or other scheduled services
 * Uses Firebase Admin SDK to bypass Firestore security rules
 */
export async function GET() {
  // Verify cron authentication
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase Admin SDK not configured - analytics update skipped',
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

    // Update Firestore using Admin SDK (bypasses security rules)
    await Promise.all([
      adminDb.doc('analytics/trendingSports').set({
        sports: analytics.trendingSports,
        lastUpdated: FieldValue.serverTimestamp(),
        version: 1,
      }),
      adminDb.doc('analytics/trendingTopics').set({
        topics: analytics.trendingTopics,
        lastUpdated: FieldValue.serverTimestamp(),
        version: 1,
      }),
      adminDb.doc('analytics/topAuthors').set({
        authors: analytics.topAuthors,
        lastUpdated: FieldValue.serverTimestamp(),
        version: 1,
      }),
      adminDb.doc('analytics/communityStats').set({
        totalPosts: analytics.communityStats.totalPosts,
        totalAuthors: analytics.communityStats.totalAuthors,
        totalRewards: analytics.communityStats.totalRewards,
        activeToday: analytics.communityStats.activeToday,
        lastUpdated: FieldValue.serverTimestamp(),
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
