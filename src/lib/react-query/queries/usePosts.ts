import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { fetchSportsblockPosts, fetchTrendingPosts, fetchHotPosts, fetchPost } from '@/lib/hive-workerbee/content';
import { ContentFilters } from '@/lib/hive-workerbee/content';
import { STALE_TIMES, getPostStaleTime } from '@/lib/constants/cache';
import { SportsblockPost } from '@/lib/shared/types';

// API response type for feed posts
interface FeedPostsResponse {
  success: boolean;
  posts: SportsblockPost[];
  hasMore: boolean;
  nextCursor?: string;
}

// Fetch function for feed posts via API route
async function fetchFeedPosts(params: {
  limit?: number;
  sort?: string;
  sportCategory?: string;
  before?: string;
}): Promise<FeedPostsResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.sportCategory) searchParams.set('sportCategory', params.sportCategory);
  if (params.before) searchParams.set('before', params.before);

  const response = await fetch(`/api/hive/posts?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }
  return response.json();
}

export function usePosts(filters: ContentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.posts.list(filters as Record<string, unknown>),
    queryFn: () => fetchSportsblockPosts(filters),
    staleTime: STALE_TIMES.REALTIME,
  });
}

export function useTrendingPosts(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.posts.list({ sort: 'trending', limit }),
    queryFn: () => fetchTrendingPosts(limit),
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useHotPosts(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.posts.list({ sort: 'hot', limit }),
    queryFn: () => fetchHotPosts(limit),
    staleTime: STALE_TIMES.STANDARD,
  });
}

/**
 * Fetch a single post by author and permlink.
 *
 * @param author - Post author username
 * @param permlink - Post permlink
 * @param options - Optional configuration
 * @param options.knownCreatedAt - If known from a list view, pass the post creation date
 *                                  to enable smart caching (older posts cache longer)
 */
export function usePost(
  author: string,
  permlink: string,
  options?: { knownCreatedAt?: Date | string }
) {
  // Calculate stale time based on post age if known
  const staleTime = options?.knownCreatedAt
    ? getPostStaleTime(options.knownCreatedAt)
    : STALE_TIMES.STANDARD;

  return useQuery({
    queryKey: queryKeys.posts.detail(`${author}/${permlink}`),
    queryFn: () => fetchPost(author, permlink),
    enabled: !!author && !!permlink,
    staleTime,
  });
}

export function useInvalidatePosts() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
    invalidateList: (filters?: Record<string, unknown>) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.list(filters || {}) }),
    invalidatePost: (author: string, permlink: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(`${author}/${permlink}`) }),
  };
}

// Infinite query hook for feed with pagination
export function useFeedPosts(options: {
  sportCategory?: string;
  limit?: number;
  sort?: string;
  enabled?: boolean;
} = {}) {
  const { sportCategory, limit = 10, sort = 'created', enabled = true } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.posts.list({ type: 'feed', sportCategory, sort }),
    queryFn: ({ pageParam }) => fetchFeedPosts({
      limit,
      sort,
      sportCategory,
      before: pageParam as string | undefined,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: STALE_TIMES.REALTIME,
    enabled,
  });
}
