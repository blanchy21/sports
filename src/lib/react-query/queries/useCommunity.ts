import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { 
  fetchCommunities, 
  fetchCommunityDetails, 
  fetchCommunityMembers,
  subscribeToCommunity,
  unsubscribeFromCommunity,
  isSubscribedToCommunity,
  CommunityFilters 
} from '@/lib/hive-workerbee/community';

export function useCommunities(filters: CommunityFilters = {}) {
  return useQuery({
    queryKey: queryKeys.communities.list(filters as Record<string, unknown>),
    queryFn: () => fetchCommunities(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCommunity(communityId: string) {
  return useQuery({
    queryKey: queryKeys.communities.detail(communityId),
    queryFn: () => fetchCommunityDetails(communityId),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCommunityMembers(communityId: string, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.communities.members(communityId),
    queryFn: () => fetchCommunityMembers(communityId, limit),
    enabled: !!communityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useIsSubscribedToCommunity(communityId: string, username: string) {
  return useQuery({
    queryKey: [...queryKeys.communities.detail(communityId), 'subscription', username],
    queryFn: () => isSubscribedToCommunity(communityId, username),
    enabled: !!communityId && !!username,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSubscribeToCommunity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ communityId, username }: { communityId: string; username: string }) =>
      subscribeToCommunity(communityId, username),
    onSuccess: (_, { communityId, username }) => {
      // Invalidate community details and subscription status
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(communityId) });
      queryClient.invalidateQueries({ 
        queryKey: [...queryKeys.communities.detail(communityId), 'subscription', username] 
      });
    },
  });
}

export function useUnsubscribeFromCommunity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ communityId, username }: { communityId: string; username: string }) =>
      unsubscribeFromCommunity(communityId, username),
    onSuccess: (_, { communityId, username }) => {
      // Invalidate community details and subscription status
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(communityId) });
      queryClient.invalidateQueries({ 
        queryKey: [...queryKeys.communities.detail(communityId), 'subscription', username] 
      });
    },
  });
}

export function useInvalidateCommunities() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.communities.all }),
    invalidateList: (filters?: Record<string, unknown>) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.list(filters || {}) }),
    invalidateCommunity: (communityId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(communityId) }),
    invalidateMembers: (communityId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.members(communityId) }),
  };
}
