import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES } from '@/lib/constants/cache';
import type { Sportsbite, SportsbiteApiResponse } from '@/lib/hive-workerbee/shared';

const SPORTSBITES_LIMIT = 20;
const SPORTSBITES_POLL_INTERVAL = 15000;

async function fetchSportsbites(params: {
  limit?: number;
  author?: string;
  before?: string;
}): Promise<SportsbiteApiResponse> {
  const searchParams = new URLSearchParams({ limit: String(params.limit ?? SPORTSBITES_LIMIT) });
  if (params.author) searchParams.append('author', params.author);
  if (params.before) searchParams.append('before', params.before);

  const response = await fetch(`/api/unified/sportsbites?${searchParams.toString()}`);
  if (!response.ok) throw new Error(`Failed to fetch sportsbites: ${response.status}`);

  const result: SportsbiteApiResponse = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to fetch sportsbites');

  return result;
}

export function useSportsbitesFeed(options: {
  author?: string;
  enabled?: boolean;
} = {}) {
  const { author, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.sportsbites.list({ author }),
    queryFn: ({ pageParam }) =>
      fetchSportsbites({
        author,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: STALE_TIMES.REALTIME,
    refetchInterval: SPORTSBITES_POLL_INTERVAL,
    enabled,
  });
}

/** Flatten all pages into a single array of sportsbites */
export function flattenSportsbitePages(
  pages: SportsbiteApiResponse[] | undefined
): Sportsbite[] {
  if (!pages) return [];
  return pages.flatMap((p) => p.sportsbites);
}

export function useInvalidateSportsbites() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.sportsbites.all }),
  };
}
