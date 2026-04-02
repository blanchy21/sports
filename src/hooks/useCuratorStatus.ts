'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { CurationType } from '@/lib/curation/config';

interface TypeCounts {
  dailyCount: number;
  remaining: number;
  limit: number;
}

interface CuratorStatusData {
  isCurator: boolean;
  posts: TypeCounts;
  sportsbites: TypeCounts;
}

/**
 * Check if the current user is a curator and their daily usage per type.
 */
export function useCuratorStatus() {
  const { user } = useAuth();
  const username = user?.username;

  const { data, isLoading, refetch } = useQuery<CuratorStatusData>({
    queryKey: ['curatorStatus', username],
    queryFn: async () => {
      if (!username) throw new Error('Not authenticated');
      const res = await fetch(`/api/curation/status?curator=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error('Failed to fetch curator status');
      const json = await res.json();

      const defaultCounts: TypeCounts = { dailyCount: 0, remaining: 0, limit: 5 };

      return {
        isCurator: json.isCurator ?? false,
        posts: json.posts ?? defaultCounts,
        sportsbites: json.sportsbites ?? defaultCounts,
      };
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    isCurator: data?.isCurator ?? false,
    posts: data?.posts ?? { dailyCount: 0, remaining: 0, limit: 5 },
    sportsbites: data?.sportsbites ?? { dailyCount: 0, remaining: 0, limit: 5 },
    /** Get counts for a specific type */
    forType: (type: CurationType): TypeCounts => {
      if (!data) return { dailyCount: 0, remaining: 0, limit: 5 };
      return type === 'sportsbite' ? data.sportsbites : data.posts;
    },
    isLoading,
    refetch,
  };
}
