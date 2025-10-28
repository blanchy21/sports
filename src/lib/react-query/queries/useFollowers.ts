import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { 
  fetchFollowers, 
  fetchFollowing, 
  followUser, 
  unfollowUser,
  SocialFilters 
} from '@/lib/hive-workerbee/social';

export function useFollowers(username: string, filters: SocialFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.users.followers(username), filters],
    queryFn: () => fetchFollowers(username, filters),
    enabled: options.enabled !== undefined ? options.enabled : !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFollowing(username: string, filters: SocialFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.users.following(username), filters],
    queryFn: () => fetchFollowing(username, filters),
    enabled: options.enabled !== undefined ? options.enabled : !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      
      // Invalidate the isFollowing check
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.users.detail(username),
        exact: false 
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
      
      // Invalidate the isFollowing check
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.users.detail(username),
        exact: false 
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
