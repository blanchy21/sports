'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import type { LmsCompetitionResponse, LmsBoardEntry, LmsMyPickResponse } from '@/lib/lms/types';

async function fetchLmsCompetitions() {
  const res = await fetch('/api/lms/competitions');
  if (!res.ok) throw new Error('Failed to fetch LMS competitions');
  const json = await res.json();
  return json.data as LmsCompetitionResponse[];
}

async function fetchLmsCompetition(id: string) {
  const res = await fetch(`/api/lms/competition/${id}`);
  if (!res.ok) throw new Error('Failed to fetch competition');
  const json = await res.json();
  return json.data as LmsCompetitionResponse;
}

async function fetchLmsBoard(id: string) {
  const res = await fetch(`/api/lms/competition/${id}/board`);
  if (!res.ok) throw new Error('Failed to fetch board');
  const json = await res.json();
  return json.data as LmsBoardEntry[];
}

async function fetchLmsMyPick(id: string) {
  const res = await fetch(`/api/lms/competition/${id}/my-pick`);
  if (!res.ok) throw new Error('Failed to fetch pick');
  const json = await res.json();
  return json.data as LmsMyPickResponse;
}

export function useLmsCompetitions() {
  return useQuery({
    queryKey: queryKeys.lms.competitions(),
    queryFn: fetchLmsCompetitions,
    staleTime: 60 * 1000,
  });
}

export function useLmsCompetition(id: string) {
  return useQuery({
    queryKey: queryKeys.lms.detail(id),
    queryFn: () => fetchLmsCompetition(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useLmsBoard(id: string) {
  return useQuery({
    queryKey: queryKeys.lms.board(id),
    queryFn: () => fetchLmsBoard(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useLmsMyPick(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.lms.myPick(id),
    queryFn: () => fetchLmsMyPick(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 15 * 1000,
  });
}

export function useLmsJoin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lms/competition/${id}/join`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || 'Failed to join');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.competitions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.myPick(id) });
    },
  });
}

export function useLmsPick(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { gameweek: number; teamPicked: string }) => {
      const res = await fetch(`/api/lms/competition/${id}/pick`, {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.myPick(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.board(id) });
    },
  });
}
