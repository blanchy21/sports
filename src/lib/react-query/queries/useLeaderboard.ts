/**
 * React Query hooks for leaderboard data
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES } from '@/lib/constants/cache';
import type { WeeklyLeaderboards, RewardCategory } from '@/lib/metrics/types';

// Response types
interface LeaderboardApiResponse {
  success: boolean;
  weekId: string;
  generatedAt: string;
  leaderboards: WeeklyLeaderboards['leaderboards'] | null;
}

export interface MyRankResponse {
  success: boolean;
  username: string;
  weekId: string;
  ranks: Record<RewardCategory, { rank: number | null; value: number }>;
  generatedAt: string;
}

async function fetchWeeklyLeaderboards(
  weekId: string,
  limit: number
): Promise<WeeklyLeaderboards | null> {
  const response = await fetch(
    `/api/metrics/leaderboard?weekId=${encodeURIComponent(weekId)}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboards');
  }

  const data: LeaderboardApiResponse = await response.json();

  if (!data.leaderboards) return null;

  return {
    weekId: data.weekId,
    generatedAt: new Date(data.generatedAt),
    leaderboards: data.leaderboards,
  };
}

async function fetchMyRank(): Promise<MyRankResponse> {
  const response = await fetch('/api/leaderboard/my-rank');
  if (!response.ok) {
    throw new Error('Failed to fetch your rankings');
  }
  return response.json();
}

/**
 * Fetch weekly leaderboards for a given week.
 */
export function useWeeklyLeaderboards(weekId: string, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.leaderboards.week(weekId),
    queryFn: () => fetchWeeklyLeaderboards(weekId, limit),
    enabled: !!weekId,
    staleTime: STALE_TIMES.STANDARD,
  });
}

/**
 * Fetch the current user's rank across all categories.
 * Only enabled when username is provided (authenticated).
 */
export function useMyRank(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leaderboards.myRank(username || ''),
    queryFn: fetchMyRank,
    enabled: !!username,
    staleTime: STALE_TIMES.STANDARD,
  });
}
