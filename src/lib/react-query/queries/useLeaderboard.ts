/**
 * React Query hooks for leaderboard data
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES } from '@/lib/constants/cache';
import type { WeeklyLeaderboards, RewardCategory, LeaderboardEntry } from '@/lib/metrics/types';

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

// ── Monthly Leaderboard ─────────────────────────────────────────────

interface MonthlyLeaderboardResponse {
  success: boolean;
  monthId: string;
  sportId: string;
  entries: LeaderboardEntry[];
  titleHolder: { username: string; badgeId: string; score: number } | null;
  generatedAt: string | null;
}

async function fetchMonthlyLeaderboard(
  monthId: string,
  sportId?: string
): Promise<MonthlyLeaderboardResponse> {
  const params = new URLSearchParams({ monthId });
  if (sportId) params.set('sportId', sportId);

  const response = await fetch(`/api/leaderboard/monthly?${params}`);
  if (!response.ok) throw new Error('Failed to fetch monthly leaderboard');
  const json = await response.json();
  return json.data ?? json;
}

export function useMonthlyLeaderboard(monthId: string, sportId?: string) {
  return useQuery({
    queryKey: queryKeys.leaderboards.monthly(monthId, sportId),
    queryFn: () => fetchMonthlyLeaderboard(monthId, sportId),
    enabled: !!monthId,
    staleTime: STALE_TIMES.LONG,
  });
}

// ── All-Time Leaderboard ────────────────────────────────────────────

export type AllTimeMetric = 'posts' | 'sportsbites' | 'comments' | 'views' | 'medals';

interface AllTimeLeaderboardResponse {
  success: boolean;
  metric: AllTimeMetric;
  entries: LeaderboardEntry[];
  total: number;
}

async function fetchAllTimeLeaderboard(
  metric: AllTimeMetric,
  limit: number
): Promise<AllTimeLeaderboardResponse> {
  const response = await fetch(`/api/leaderboard/all-time?metric=${metric}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch all-time leaderboard');
  const json = await response.json();
  return json.data ?? json;
}

export function useAllTimeLeaderboard(metric: AllTimeMetric = 'medals', limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.leaderboards.allTime(metric),
    queryFn: () => fetchAllTimeLeaderboard(metric, limit),
    staleTime: STALE_TIMES.LONG,
  });
}
