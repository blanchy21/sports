'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface CuratorStatus {
  isCurator: boolean;
  dailyCount: number;
  remaining: number;
  limit: number;
}

/**
 * Check if the current user is a curator and their daily usage.
 * Only fetches when authenticated.
 */
export function useCuratorStatus() {
  const { user } = useAuth();
  const username = user?.username;

  const { data, isLoading, refetch } = useQuery<CuratorStatus>({
    queryKey: ['curatorStatus', username],
    queryFn: async () => {
      if (!username) throw new Error('Not authenticated');
      const res = await fetch(`/api/curation/status?curator=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error('Failed to fetch curator status');
      const json = await res.json();
      return {
        isCurator: json.isCurator ?? false,
        dailyCount: json.dailyCount ?? 0,
        remaining: json.remaining ?? 0,
        limit: json.limit ?? 5,
      };
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  return {
    isCurator: data?.isCurator ?? false,
    dailyCount: data?.dailyCount ?? 0,
    remaining: data?.remaining ?? 0,
    limit: data?.limit ?? 5,
    isLoading,
    refetch,
  };
}
