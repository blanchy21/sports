import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/constants/cache';
import type { PredictionUserStats } from '@/lib/predictions/types';

const predictionStatsKeys = {
  all: ['predictions', 'stats'] as const,
  user: (username: string) => [...predictionStatsKeys.all, username] as const,
};

interface StatsResponse {
  success: boolean;
  data: PredictionUserStats;
  error?: { message: string };
}

async function fetchPredictionStats(username: string): Promise<PredictionUserStats> {
  const response = await fetch(`/api/predictions/stats?username=${encodeURIComponent(username)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch prediction stats: ${response.status}`);
  }

  const result: StatsResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to fetch prediction stats');
  }

  return result.data;
}

export function usePredictionStats(username: string | undefined) {
  return useQuery({
    queryKey: predictionStatsKeys.user(username || ''),
    queryFn: () => fetchPredictionStats(username!),
    enabled: !!username,
    staleTime: STALE_TIMES.STANDARD,
  });
}
