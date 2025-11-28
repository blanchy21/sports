import { NextResponse } from 'next/server';
import { 
  TrendingSport, 
  TrendingTopic, 
  TopAuthor, 
  CommunityStats 
} from '@/lib/hive-workerbee/analytics';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Analytics API endpoint
 * Fetches analytics data from Firebase Firestore (layer 2 database)
 * This data is custom to Sportsblock and not available from Hive API
 */
export async function GET() {
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

    return NextResponse.json({
      success: true,
      data: analytics,
    });

  } catch (error) {
    console.error('[API] Error fetching analytics:', error);
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
        }
      },
      { status: 500 }
    );
  }
}

