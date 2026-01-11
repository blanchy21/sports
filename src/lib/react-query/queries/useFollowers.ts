import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import {
  fetchFollowers,
  fetchFollowing,
  followUser,
  unfollowUser,
  SocialResult
} from '@/lib/hive-workerbee/social';

const PAGE_SIZE = 50;

export function useFollowers(username: string, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.users.followers(username)],
    queryFn: ({ pageParam }) => fetchFollowers(username, {
      limit: PAGE_SIZE,
      before: pageParam
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: SocialResult) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: options.enabled !== undefined ? options.enabled : !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      // Flatten all pages into a single result for easier consumption
      relationships: data.pages.flatMap(page => page.relationships),
      hasMore: data.pages[data.pages.length - 1]?.hasMore ?? false,
      total: data.pages[0]?.total,
    }),
  });
}

export function useFollowing(username: string, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.users.following(username)],
    queryFn: ({ pageParam }) => fetchFollowing(username, {
      limit: PAGE_SIZE,
      before: pageParam
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: SocialResult) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: options.enabled !== undefined ? options.enabled : !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      // Flatten all pages into a single result for easier consumption
      relationships: data.pages.flatMap(page => page.relationships),
      hasMore: data.pages[data.pages.length - 1]?.hasMore ?? false,
      total: data.pages[0]?.total,
    }),
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ username, follower }: { username: string; follower: string }) =>
      followUser(username, follower),
    onSuccess: (_, { username, follower }) => {
      // Invalidate follower/following lists for both users
      queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following(follower) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(follower) });
      
      // Invalidate the isFollowing check for this specific user pair
      queryClient.invalidateQueries({ 
        queryKey: [...queryKeys.users.detail(username), 'following', follower]
      });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ username, follower }: { username: string; follower: string }) =>
      unfollowUser(username, follower),
    onSuccess: (_, { username, follower }) => {
      // Invalidate follower/following lists for both users
      queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following(follower) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(follower) });
      
      // Invalidate the isFollowing check for this specific user pair
      queryClient.invalidateQueries({ 
        queryKey: [...queryKeys.users.detail(username), 'following', follower]
      });
    },
  });
}

export function useInvalidateFollowers() {
  const queryClient = useQueryClient();
  
  return {
    invalidateFollowers: (username: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(username) }),
    invalidateFollowing: (username: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following(username) }),
  };
}
