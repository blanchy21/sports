import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { 
  fetchFollowers, 
  fetchFollowing, 
  followUser, 
  unfollowUser
} from '@/lib/hive-workerbee/social';

export function useFollowers(username: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.users.followers(username)],
    queryFn: () => fetchFollowers(username),
    enabled: options.enabled !== undefined ? options.enabled : !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFollowing(username: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.users.following(username)],
    queryFn: () => fetchFollowing(username),
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
