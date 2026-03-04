import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/constants/cache';
import type { MedalsRank } from '@/lib/badges/types';

export interface UserStatsData {
  username: string;
  totalPosts: number;
  totalSportsbites: number;
  totalComments: number;
  totalViewsReceived: number;
  totalTipsReceived: number;
  totalMedalsEarned: number;
  memberSince: string;
  lastActiveAt: string;
  currentPostingStreak: number;
  longestPostingStreak: number;
  medalsScore: number;
  medalsRank: MedalsRank | null;
}

export interface UserStatsResponse {
  stats: UserStatsData;
  predictions: { total: number; wins: number; winRate: number };
  sportRanks: { sportId: string; score: number; label: string; rank: MedalsRank }[];
}

const userStatsKeys = {
  all: ['userStats'] as const,
  user: (username: string) => [...userStatsKeys.all, username] as const,
};

interface ApiResponse {
  success: boolean;
  data: UserStatsResponse;
  error?: { message: string };
}

async function fetchUserStats(username: string): Promise<UserStatsResponse> {
  const response = await fetch(`/api/user-stats?username=${encodeURIComponent(username)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user stats: ${response.status}`);
  }
  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to fetch user stats');
  }
  return result.data;
}

export function useUserStats(username: string | undefined) {
  return useQuery({
    queryKey: userStatsKeys.user(username || ''),
    queryFn: () => fetchUserStats(username!),
    enabled: !!username,
    staleTime: STALE_TIMES.STANDARD,
  });
}
