import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { fetchSportsblockPosts, fetchTrendingPosts, fetchHotPosts, fetchPost } from '@/lib/hive-workerbee/content';
import { ContentFilters } from '@/lib/hive-workerbee/content';
import { STALE_TIMES } from '@/lib/constants/cache';

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

export function usePost(author: string, permlink: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(`${author}/${permlink}`),
    queryFn: () => fetchPost(author, permlink),
    enabled: !!author && !!permlink,
    staleTime: STALE_TIMES.STANDARD,
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
