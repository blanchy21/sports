import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { fetchComments } from '@/lib/hive-workerbee/content';
import { getUserComments } from '@/lib/hive-workerbee/comments';

export function useComments(author: string, permlink: string) {
  return useQuery({
    queryKey: queryKeys.comments.list(`${author}/${permlink}`),
    queryFn: () => fetchComments(author, permlink),
    enabled: !!author && !!permlink,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserComments(username: string, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.comments.user(username),
    queryFn: () => getUserComments(username, limit),
    enabled: !!username,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
