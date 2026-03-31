'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import type {
  UserBadgeData,
  UserRankData,
  UserSportRankData,
  MedalsRank,
} from '@/lib/badges/types';

export interface MonthlyTitleData {
  sportId: string;
  monthId: string;
  badgeId: string;
  score: number;
}

interface BadgesResponse {
  success: boolean;
  data: {
    badges: UserBadgeData[];
    rank: UserRankData | null;
    sportRanks: UserSportRankData[];
    monthlyTitles: MonthlyTitleData[];
    stats: { totalBadges: number };
  };
}

async function fetchUserBadges(username: string): Promise<BadgesResponse['data']> {
  const res = await fetch(`/api/badges?username=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error('Failed to fetch badges');
  const json: BadgesResponse = await res.json();
  return json.data;
}

/**
 * Full badge + rank data for a user. staleTime 5min.
 */
export function useUserBadges(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.badges.user(username ?? ''),
    queryFn: () => fetchUserBadges(username!),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Lightweight hook that returns just the user's rank.
 * Derives from the same endpoint but selects only the rank field.
 */
export function useUserRank(username: string | undefined): {
  rank: MedalsRank | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.badges.user(username ?? ''),
    queryFn: () => fetchUserBadges(username!),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    select: (d) => d.rank?.rank ?? null,
  });

  return { rank: data ?? null, isLoading };
}

/**
 * Batch prefetch user ranks using a single batch API request.
 * Populates the React Query cache so individual useUserRank hooks
 * get instant cache hits instead of N individual requests.
 */
export async function prefetchUserBadges(
  usernames: string[],
  queryClient: QueryClient
): Promise<void> {
  const uniqueUsernames = [...new Set(usernames.filter(Boolean))];
  if (uniqueUsernames.length === 0) return;

  // Only fetch usernames not already cached
  const uncachedUsernames = uniqueUsernames.filter((username) => {
    const cached = queryClient.getQueryData(queryKeys.badges.user(username));
    return cached === undefined;
  });

  if (uncachedUsernames.length === 0) return;

  try {
    const response = await fetch(
      `/api/badges/batch?usernames=${encodeURIComponent(uncachedUsernames.join(','))}`
    );

    if (!response.ok) {
      throw new Error(`Batch badges fetch failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data?.ranks) return;

    for (const username of uncachedUsernames) {
      const rankData = data.data.ranks[username];
      // Populate cache with minimal shape that useUserRank's select() can extract from
      queryClient.setQueryData(queryKeys.badges.user(username), {
        badges: [],
        rank: rankData,
        sportRanks: [],
        monthlyTitles: [],
        stats: { totalBadges: 0 },
      });
    }
  } catch (error) {
    console.warn('[UserBadges] Batch prefetch failed:', error);
  }
}
