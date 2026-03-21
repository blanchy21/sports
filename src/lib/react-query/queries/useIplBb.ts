'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import type {
  IplBbCompetitionCard,
  IplBbCompetitionDetail,
  IplBbLeaderboardEntry,
  IplBbPickWithResult,
} from '@/lib/ipl-bb/types';

async function fetchIplBbCompetitions() {
  const res = await fetch('/api/ipl-bb/competitions');
  if (!res.ok) throw new Error('Failed to fetch IPL BB competitions');
  const json = await res.json();
  return json.data as IplBbCompetitionCard[];
}

async function fetchIplBbCompetition(id: string) {
  const res = await fetch(`/api/ipl-bb/competition/${id}`);
  if (!res.ok) throw new Error('Failed to fetch competition');
  const json = await res.json();
  return json.data as IplBbCompetitionDetail;
}

async function fetchIplBbLeaderboard(id: string) {
  const res = await fetch(`/api/ipl-bb/competition/${id}/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const json = await res.json();
  return json.data as IplBbLeaderboardEntry[];
}

async function fetchIplBbMyPicks(id: string) {
  const res = await fetch(`/api/ipl-bb/competition/${id}/my-picks`);
  if (!res.ok) throw new Error('Failed to fetch picks');
  const json = await res.json();
  return json.data as IplBbPickWithResult[];
}

export function useIplBbCompetitions() {
  return useQuery({
    queryKey: queryKeys.iplBb.competitions(),
    queryFn: fetchIplBbCompetitions,
    staleTime: 60 * 1000,
  });
}

export function useIplBbCompetition(id: string) {
  return useQuery({
    queryKey: queryKeys.iplBb.detail(id),
    queryFn: () => fetchIplBbCompetition(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useIplBbLeaderboard(id: string) {
  return useQuery({
    queryKey: queryKeys.iplBb.leaderboard(id),
    queryFn: () => fetchIplBbLeaderboard(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useIplBbMyPicks(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.iplBb.myPicks(id),
    queryFn: () => fetchIplBbMyPicks(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 15 * 1000,
  });
}

export function useIplBbJoin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ipl-bb/competition/${id}/join`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || 'Failed to join');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.competitions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.myPicks(id) });
    },
  });
}

export function useIplBbPick(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { matchId: string; guess: number }) => {
      const res = await fetch(`/api/ipl-bb/competition/${id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || 'Failed to submit pick');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.myPicks(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.leaderboard(id) });
    },
  });
}
