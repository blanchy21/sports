import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { STALE_TIMES } from '@/lib/constants/cache';
import type { PredictionBite, PredictionLeaderboardEntry } from '@/lib/predictions/types';

// Query key factory
export const predictionKeys = {
  all: ['predictions'] as const,
  lists: () => [...predictionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...predictionKeys.lists(), filters] as const,
  details: () => [...predictionKeys.all, 'detail'] as const,
  detail: (id: string) => [...predictionKeys.details(), id] as const,
  leaderboard: (params: Record<string, unknown>) =>
    [...predictionKeys.all, 'leaderboard', params] as const,
};

// API response envelope
interface PredictionsListResponse {
  success: boolean;
  data: {
    predictions: PredictionBite[];
    nextCursor?: string;
  };
  error?: { message: string };
}

interface PredictionDetailResponse {
  success: boolean;
  data: {
    prediction: PredictionBite;
  };
  error?: { message: string };
}

interface LeaderboardResponse {
  success: boolean;
  data: {
    leaderboard: PredictionLeaderboardEntry[];
  };
  error?: { message: string };
}

interface PredictionFilters {
  status?: string;
  sport?: string;
  creator?: string;
  [key: string]: unknown;
}

/**
 * Fetch paginated predictions with optional filters
 */
export function usePredictions(filters?: PredictionFilters) {
  return useInfiniteQuery({
    queryKey: predictionKeys.list(filters ?? {}),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.sport) params.set('sport', filters.sport);
      if (filters?.creator) params.set('creator', filters.creator);
      if (pageParam) params.set('cursor', pageParam);

      const response = await fetch(`/api/predictions?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch predictions: ${response.status}`);

      const result: PredictionsListResponse = await response.json();
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch predictions');

      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIMES.REALTIME,
  });
}

/**
 * Fetch a single prediction by ID
 */
export function usePrediction(id: string) {
  return useQuery({
    queryKey: predictionKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/predictions/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch prediction: ${response.status}`);

      const result: PredictionDetailResponse = await response.json();
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch prediction');

      return result.data.prediction;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.REALTIME,
  });
}

/**
 * Fetch the prediction leaderboard
 */
export function usePredictionLeaderboard(params?: {
  sort?: string;
  period?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: predictionKeys.leaderboard(params ?? {}),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.period) searchParams.set('period', params.period);
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/predictions/leaderboard?${searchParams.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch leaderboard: ${response.status}`);

      const result: LeaderboardResponse = await response.json();
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch leaderboard');

      return result.data.leaderboard;
    },
    staleTime: STALE_TIMES.STANDARD,
  });
}
