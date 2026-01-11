import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES } from '@/lib/constants/cache';

// Types for comments (imported from workerbee types)
interface HiveComment {
  author: string;
  permlink: string;
  body: string;
  created: string;
  parent_author?: string;
  parent_permlink?: string;
  net_votes?: number;
  [key: string]: unknown;
}

export function useComments(author: string, permlink: string) {
  return useQuery({
    queryKey: queryKeys.comments.list(`${author}/${permlink}`),
    queryFn: async () => {
      const response = await fetch(`/api/hive/comments?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }
      const result = await response.json();
      return (result.success ? result.comments : []) as HiveComment[];
    },
    enabled: !!author && !!permlink,
    staleTime: STALE_TIMES.REALTIME
  });
}

export function useUserComments(username: string, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.comments.user(username),
    queryFn: async () => {
      const response = await fetch(`/api/hive/comments?username=${encodeURIComponent(username)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user comments: ${response.status}`);
      }
      const result = await response.json();
      return (result.success ? result.comments : []) as HiveComment[];
    },
    enabled: !!username,
    staleTime: STALE_TIMES.REALTIME
  });
}

export function useInvalidateComments() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.comments.all }),
    invalidatePostComments: (author: string, permlink: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(`${author}/${permlink}`) }),
  };
}
