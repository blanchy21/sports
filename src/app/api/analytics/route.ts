import { NextResponse } from 'next/server';
import {
  TrendingSport,
  TrendingTopic,
  TopAuthor,
  CommunityStats,
  getAnalyticsData,
} from '@/lib/hive-workerbee/analytics';
import { SportsblockPost } from '@/lib/hive-workerbee/content';
import { fetchSportsbites } from '@/lib/hive-workerbee/sportsbites';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fetch posts via internal API route (more reliable than direct WorkerBee call)
 */
async function fetchPostsViaInternalApi(limit: number = 20): Promise<SportsblockPost[]> {
  try {
    // Use env var for app URL to avoid SSRF via Host header manipulation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${appUrl}/api/hive/posts?limit=${limit}&sort=created`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`[Analytics API] Internal API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.posts || [];
  } catch (error) {
    console.warn('[Analytics API] Error fetching posts via internal API:', error);
    return [];
  }
}

const ROUTE = '/api/analytics';

/**
 * Analytics API endpoint
 * Fetches analytics data from Firebase Firestore (layer 2 database)
 * This data is custom to Sportsblock and not available from Hive API
 */
export async function GET() {
  const startTime = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

  console.log(`[${ROUTE}] Request started`, {
    requestId,
    firebaseConfigured: !!db,
    timestamp: new Date().toISOString(),
  });

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

    // If Firebase is not configured, compute analytics directly from Hive
    if (!db) {
      console.log('[Analytics API] Firebase not configured, computing analytics from Hive...');
      const [posts, bitesResult] = await Promise.all([
        fetchPostsViaInternalApi(20),
        fetchSportsbites({ limit: 200 }),
      ]);
      if (posts.length > 0) {
        const computedAnalytics = await getAnalyticsData(posts, undefined, bitesResult.sportsbites);
        return NextResponse.json({
          success: true,
          data: computedAnalytics,
          message: 'Computed from Hive (Firebase not configured)',
        });
      }
      return NextResponse.json({
        success: true,
        data: analytics,
        message: 'Firebase not configured - returning default analytics',
      });
    }

    // Fetch trending sports from Firestore
    try {
      const trendingSportsDoc = doc(db, 'analytics', 'trendingSports');
      const trendingSportsSnap = await getDoc(trendingSportsDoc);
      if (trendingSportsSnap.exists()) {
        const data = trendingSportsSnap.data();
        analytics.trendingSports = data.sports || data.trendingSports || [];
      }
    } catch (error) {
      console.warn('[Analytics API] Error fetching trendingSports:', error);
      // Continue with empty array if document doesn't exist or permission denied
    }

    // Fetch trending topics from Firestore
    try {
      const trendingTopicsDoc = doc(db, 'analytics', 'trendingTopics');
      const trendingTopicsSnap = await getDoc(trendingTopicsDoc);
      if (trendingTopicsSnap.exists()) {
        const data = trendingTopicsSnap.data();
        analytics.trendingTopics = data.topics || data.trendingTopics || [];
      }
    } catch (error) {
      console.warn('[Analytics API] Error fetching trendingTopics:', error);
    }

    // Fetch top authors from Firestore
    try {
      const topAuthorsDoc = doc(db, 'analytics', 'topAuthors');
      const topAuthorsSnap = await getDoc(topAuthorsDoc);
      if (topAuthorsSnap.exists()) {
        const data = topAuthorsSnap.data();
        analytics.topAuthors = data.authors || data.topAuthors || [];
      }
    } catch (error) {
      console.warn('[Analytics API] Error fetching topAuthors:', error);
    }

    // Fetch community stats from Firestore
    try {
      const communityStatsDoc = doc(db, 'analytics', 'communityStats');
      const communityStatsSnap = await getDoc(communityStatsDoc);
      if (communityStatsSnap.exists()) {
        const data = communityStatsSnap.data();
        analytics.communityStats = {
          totalPosts: data.totalPosts || 0,
          totalAuthors: data.totalAuthors || 0,
          totalRewards: data.totalRewards || 0,
          activeToday: data.activeToday || 0,
        };
      }
    } catch (error) {
      console.warn('[Analytics API] Error fetching communityStats:', error);
    }

    // Fallback: If Firestore data is empty or stale (all zeros), compute analytics from Hive posts
    const hasMeaningfulSportsData = analytics.trendingSports.some((s) => s.posts > 0);
    const hasMeaningfulTopicsData = analytics.trendingTopics.some((t) => t.posts > 0);
    const hasMeaningfulAuthorsData = analytics.topAuthors.length > 0;
    const hasMeaningfulStats = analytics.communityStats.totalPosts > 0;

    const isFirestoreEmptyOrStale =
      !hasMeaningfulSportsData &&
      !hasMeaningfulTopicsData &&
      !hasMeaningfulAuthorsData &&
      !hasMeaningfulStats;

    if (isFirestoreEmptyOrStale) {
      console.log('[Analytics API] Firestore empty or stale, computing analytics from Hive...');
      const [posts, bitesResult] = await Promise.all([
        fetchPostsViaInternalApi(20),
        fetchSportsbites({ limit: 200 }),
      ]);
      if (posts.length > 0) {
        const computedAnalytics = await getAnalyticsData(posts, undefined, bitesResult.sportsbites);
        analytics.trendingSports = computedAnalytics.trendingSports;
        analytics.trendingTopics = computedAnalytics.trendingTopics;
        analytics.topAuthors = computedAnalytics.topAuthors;
        analytics.communityStats = computedAnalytics.communityStats;
        console.log(
          `[Analytics API] Computed analytics from ${posts.length} posts and ${bitesResult.sportsbites.length} sportsbites`
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${ROUTE}] Request failed after ${duration}ms`, {
      requestId,
      firebaseConfigured: !!db,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error),
      timestamp: new Date().toISOString(),
    });

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: message,
        // Return empty data on error so UI doesn't break
        data: {
          trendingSports: [],
          trendingTopics: [],
          topAuthors: [],
          communityStats: {
            totalPosts: 0,
            totalAuthors: 0,
            totalRewards: 0,
            activeToday: 0,
          },
        },
      },
      { status: 500 }
    );
  }
}
