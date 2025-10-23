import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { getFollowerCount, getFollowingCount, isFollowingUser } from '@/lib/hive-workerbee/social';

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(username),
    queryFn: () => fetchUserAccount(username),
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserFollowerCount(username: string) {
  return useQuery({
    queryKey: [...queryKeys.users.followers(username), 'count'],
    queryFn: () => getFollowerCount(username),
    enabled: !!username,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUserFollowingCount(username: string) {
  return useQuery({
    queryKey: [...queryKeys.users.following(username), 'count'],
    queryFn: () => getFollowingCount(username),
    enabled: !!username,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useIsFollowingUser(username: string, follower: string) {
  return useQuery({
    queryKey: [...queryKeys.users.detail(username), 'following', follower],
    queryFn: () => isFollowingUser(username, follower),
    enabled: !!username && !!follower,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useInvalidateUserProfile() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
    invalidateUser: (username: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(username) }),
    invalidateFollowers: (username: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(username) }),
    invalidateFollowing: (username: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following(username) }),
  };
}
