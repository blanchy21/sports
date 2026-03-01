import { useQuery } from '@tanstack/react-query';

/**
 * Local types matching the API response shape from /api/analytics.
 * Defined here to avoid importing from the server-only analytics module.
 */
interface TrendingSport {
  sport: {
    id: string;
    name: string;
    icon: string;
  };
  posts: number;
  trending: boolean;
}

interface TrendingTopic {
  id: string;
  name: string;
  posts: number;
}

interface TopAuthor {
  id: string;
  username: string;
  displayName: string;
  posts: number;
  engagement: number;
  followers?: string;
}

interface CommunityStats {
  totalPosts: number;
  totalAuthors: number;
  totalRewards: number;
  activeToday: number;
}

/**
 * Sidebar analytics data structure
 */
export interface SidebarAnalyticsData {
  trendingSports: TrendingSport[];
  trendingTopics: TrendingTopic[];
  topAuthors: TopAuthor[];
  communityStats: CommunityStats;
}

/**
 * Default analytics data (used as fallback)
 */
const defaultAnalytics: SidebarAnalyticsData = {
  trendingSports: [],
  trendingTopics: [],
  topAuthors: [],
  communityStats: {
    totalPosts: 0,
    totalAuthors: 0,
    totalRewards: 0,
    activeToday: 0,
  },
};

/**
 * Fetch sidebar analytics from the API
 */
async function fetchSidebarAnalytics(): Promise<SidebarAnalyticsData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('/api/analytics', {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.status}`);
    }

    const apiResult = await response.json();
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to fetch analytics');
    }

    const analytics = apiResult.data;
    return {
      trendingSports: analytics.trendingSports || [],
      trendingTopics: analytics.trendingTopics || [],
      topAuthors: analytics.topAuthors || [],
      communityStats: analytics.communityStats || defaultAnalytics.communityStats,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Query key for sidebar analytics
 */
export const sidebarAnalyticsQueryKey = ['sidebar', 'analytics'] as const;

/**
 * Hook to fetch and cache sidebar analytics data
 *
 * Uses aggressive caching to prevent refetches during navigation:
 * - staleTime: 5 minutes (data considered fresh)
 * - gcTime: 30 minutes (data kept in cache)
 * - refetchOnMount: false (don't refetch when component remounts)
 * - refetchOnWindowFocus: false (don't refetch on tab switch)
 */
export function useSidebarAnalytics() {
  return useQuery({
    queryKey: sidebarAnalyticsQueryKey,
    queryFn: fetchSidebarAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnMount: false, // Don't refetch when sidebar remounts (navigation)
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnReconnect: true, // Do refetch when network reconnects
    retry: 1, // Retry once on failure
    placeholderData: defaultAnalytics, // Show empty state while loading
  });
}
