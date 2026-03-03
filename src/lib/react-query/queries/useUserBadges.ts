'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import type {
  UserBadgeData,
  UserRankData,
  UserSportRankData,
  MedalsRank,
} from '@/lib/badges/types';

interface BadgesResponse {
  success: boolean;
  data: {
    badges: UserBadgeData[];
    rank: UserRankData | null;
    sportRanks: UserSportRankData[];
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
