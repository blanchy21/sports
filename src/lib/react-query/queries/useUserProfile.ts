import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { getFollowerCount, getFollowingCount, isFollowingUser } from '@/lib/hive-workerbee/social';
import { STALE_TIMES } from '@/lib/constants/cache';

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(username),
    queryFn: () => fetchUserAccount(username),
    enabled: !!username,
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useUserFollowerCount(username: string) {
  return useQuery({
    queryKey: [...queryKeys.users.followers(username), 'count'],
    queryFn: () => getFollowerCount(username),
    enabled: !!username,
    staleTime: STALE_TIMES.STABLE,
  });
}

export function useUserFollowingCount(username: string) {
  return useQuery({
    queryKey: [...queryKeys.users.following(username), 'count'],
    queryFn: () => getFollowingCount(username),
    enabled: !!username,
    staleTime: STALE_TIMES.STABLE,
  });
}

export function useIsFollowingUser(username: string, follower: string) {
  return useQuery({
    queryKey: [...queryKeys.users.detail(username), 'following', follower],
    queryFn: () => isFollowingUser(username, follower),
    enabled: !!username && !!follower,
    staleTime: STALE_TIMES.REALTIME,
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

/**
 * Soft user profile interface
 */
export interface SoftUserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isHiveUser: boolean;
  hiveUsername?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch a soft user profile by username
 */
export function useSoftUserProfile(username: string) {
  return useQuery({
    queryKey: ['softUsers', 'detail', username],
    queryFn: async (): Promise<SoftUserProfile | null> => {
      const response = await fetch(`/api/soft/users?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch soft user profile');
      }
      const data = await response.json();
      return data.success ? data.user : null;
    },
    enabled: !!username,
    staleTime: STALE_TIMES.STANDARD,
  });
}
