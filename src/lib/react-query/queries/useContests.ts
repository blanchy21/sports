/**
 * Contest React Query Hooks
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import type {
  ContestResponse,
  ContestTeamResponse,
  ContestMatchResponse,
  ContestLeaderboardEntry,
} from '@/lib/contests/types';

// ============================================================================
// Fetch functions
// ============================================================================

async function fetchContests(filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', String(filters.status));
  if (filters.limit) params.set('limit', String(filters.limit));

  const res = await fetch(`/api/contests?${params}`);
  if (!res.ok) throw new Error('Failed to fetch contests');
  const json = await res.json();
  return json.data as ContestResponse[];
}

async function fetchContest(slug: string) {
  const res = await fetch(`/api/contests/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch contest');
  const json = await res.json();
  return json.data as ContestResponse;
}

async function fetchContestTeams(slug: string) {
  const res = await fetch(`/api/contests/${slug}/teams`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  const json = await res.json();
  return json.data as ContestTeamResponse[];
}

async function fetchContestMatches(slug: string) {
  const res = await fetch(`/api/contests/${slug}/matches`);
  if (!res.ok) throw new Error('Failed to fetch matches');
  const json = await res.json();
  return json.data as ContestMatchResponse[];
}

async function fetchContestLeaderboard(slug: string, limit = 50, offset = 0) {
  const res = await fetch(`/api/contests/${slug}/leaderboard?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const json = await res.json();
  return {
    entries: json.data as ContestLeaderboardEntry[],
    golferScores: json.golferScores as Record<string, unknown> | undefined,
    pagination: json.pagination as { total: number; hasMore: boolean },
  };
}

// ============================================================================
// Query hooks
// ============================================================================

export function useContestList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.contests.list(filters),
    queryFn: () => fetchContests(filters),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useContest(slug: string) {
  return useQuery({
    queryKey: queryKeys.contests.detail(slug),
    queryFn: () => fetchContest(slug),
    enabled: !!slug,
    staleTime: 30 * 1000,
  });
}

export function useContestTeams(slug: string) {
  return useQuery({
    queryKey: queryKeys.contests.teams(slug),
    queryFn: () => fetchContestTeams(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 min — teams rarely change
  });
}

export function useContestMatches(slug: string) {
  return useQuery({
    queryKey: queryKeys.contests.matches(slug),
    queryFn: () => fetchContestMatches(slug),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}

export function useContestLeaderboard(slug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.contests.leaderboard(slug),
    queryFn: () => fetchContestLeaderboard(slug),
    enabled: options?.enabled !== false && !!slug,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Poll every minute when active
  });
}

// ============================================================================
// Mutation hooks
// ============================================================================

export function useContestEntry(slug: string) {
  return useMutation({
    mutationFn: async (entryData: unknown) => {
      const res = await fetch(`/api/contests/${slug}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryData }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit entry');
      }
      return res.json();
    },
  });
}

export function useContestInterestToggle(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contests/${slug}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to toggle interest');
      }
      const json = await res.json();
      return json.data as { isInterested: boolean; interestCount: number };
    },
    onSuccess: (data) => {
      // Optimistic update detail cache
      queryClient.setQueryData<ContestResponse>(queryKeys.contests.detail(slug), (old) =>
        old ? { ...old, isInterested: data.isInterested, interestCount: data.interestCount } : old
      );
      // Invalidate list to refresh counts
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.lists() });
    },
  });
}

export function useContestEntryConfirm(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { entryToken: string; txId: string; entryData: unknown }) => {
      const res = await fetch(`/api/contests/${slug}/enter/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to confirm entry');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.detail(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.leaderboard(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.all });
    },
  });
}
