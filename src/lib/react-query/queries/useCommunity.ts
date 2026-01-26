import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES } from '@/lib/constants/cache';
import {
  Community,
  CommunityMember,
  CommunityFilters,
  CommunityListResult,
  CreateCommunityInput,
  UpdateCommunityInput,
} from '@/types';

// API fetcher functions

async function fetchCommunitiesAPI(filters: CommunityFilters = {}): Promise<CommunityListResult> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.sportCategory) params.set('sportCategory', filters.sportCategory);
  if (filters.type) params.set('type', filters.type);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const response = await fetch(`/api/communities?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch communities');
  }
  return response.json();
}

async function fetchCommunityAPI(communityId: string): Promise<Community | null> {
  const response = await fetch(`/api/communities/${communityId}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch community');
  }
  const data = await response.json();
  return data.community;
}

async function fetchCommunityMembersAPI(
  communityId: string,
  options: { status?: string; role?: string; limit?: number } = {}
): Promise<CommunityMember[]> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.role) params.set('role', options.role);
  if (options.limit) params.set('limit', String(options.limit));

  const response = await fetch(`/api/communities/${communityId}/members?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch members');
  }
  const data = await response.json();
  return data.members;
}

async function checkMembershipAPI(
  communityId: string,
  userId: string
): Promise<CommunityMember | null> {
  try {
    const response = await fetch(`/api/communities/${communityId}/members?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.membership || null;
  } catch {
    return null;
  }
}

// Hooks

export function useCommunities(filters: CommunityFilters = {}) {
  return useQuery({
    queryKey: queryKeys.communities.list(filters as Record<string, unknown>),
    queryFn: () => fetchCommunitiesAPI(filters),
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useCommunity(communityId: string) {
  return useQuery({
    queryKey: queryKeys.communities.detail(communityId),
    queryFn: () => fetchCommunityAPI(communityId),
    enabled: !!communityId,
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useCommunityMembers(
  communityId: string,
  options: { status?: string; role?: string; limit?: number } = {}
) {
  return useQuery({
    queryKey: [...queryKeys.communities.members(communityId), options],
    queryFn: () => fetchCommunityMembersAPI(communityId, options),
    enabled: !!communityId,
    staleTime: STALE_TIMES.STABLE,
  });
}

export function useMembership(communityId: string, userId: string) {
  return useQuery({
    queryKey: [...queryKeys.communities.detail(communityId), 'membership', userId],
    queryFn: () => checkMembershipAPI(communityId, userId),
    enabled: !!communityId && !!userId,
    staleTime: STALE_TIMES.REALTIME,
  });
}

// Legacy alias for backward compatibility
export function useIsSubscribedToCommunity(communityId: string, userId: string) {
  const { data: membership, ...rest } = useMembership(communityId, userId);
  return {
    ...rest,
    data: membership?.status === 'active',
  };
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      creatorId,
      creatorUsername,
      hiveUsername,
    }: {
      input: CreateCommunityInput;
      creatorId: string;
      creatorUsername: string;
      hiveUsername?: string;
    }) => {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          creatorId,
          creatorUsername,
          hiveUsername,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create community');
      }

      const data = await response.json();
      return { community: data.community as Community, creatorId };
    },
    onSuccess: ({ community, creatorId }) => {
      // Invalidate communities list
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
      // Invalidate the new community's membership query so it fetches the creator's admin membership
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.communities.detail(community.id), 'membership', creatorId],
      });
      // Invalidate the community members list
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.members(community.id) });
      // Invalidate user communities list
      queryClient.invalidateQueries({ queryKey: ['userCommunities', creatorId] });
    },
  });
}

export function useUpdateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      updates,
      userId,
    }: {
      communityId: string;
      updates: UpdateCommunityInput;
      userId: string;
    }) => {
      const response = await fetch(`/api/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update community');
      }

      const data = await response.json();
      return data.community as Community;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(communityId) });
    },
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      userId,
      username,
      hiveUsername,
    }: {
      communityId: string;
      userId: string;
      username: string;
      hiveUsername?: string;
    }) => {
      const response = await fetch(`/api/communities/${communityId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, hiveUsername }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join community');
      }

      const data = await response.json();
      return data.member as CommunityMember;
    },
    onSuccess: (_, { communityId, userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(communityId) });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.communities.detail(communityId), 'membership', userId],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.members(communityId) });
    },
  });
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      userId,
    }: {
      communityId: string;
      userId: string;
    }) => {
      const response = await fetch(`/api/communities/${communityId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave community');
      }
    },
    onSuccess: (_, { communityId, userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(communityId) });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.communities.detail(communityId), 'membership', userId],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.members(communityId) });
    },
  });
}

// Legacy aliases for backward compatibility
export function useSubscribeToCommunity() {
  return useJoinCommunity();
}

export function useUnsubscribeFromCommunity() {
  return useLeaveCommunity();
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

// Community Posts Hook
export function useCommunityPosts(
  communityId: string,
  options: { limit?: number; sort?: string } = {}
) {
  return useQuery({
    queryKey: [...queryKeys.communities.detail(communityId), 'posts', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', String(options.limit));
      if (options.sort) params.set('sort', options.sort);

      const response = await fetch(`/api/communities/${communityId}/posts?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch posts');
      }
      return response.json();
    },
    enabled: !!communityId,
    staleTime: STALE_TIMES.REALTIME,
  });
}

// User's communities hook
export function useUserCommunities(userId: string) {
  return useQuery({
    queryKey: ['userCommunities', userId],
    queryFn: async () => {
      // Fetch all communities and filter by membership
      // This is a client-side approach; could be optimized with a dedicated endpoint
      const communitiesResponse = await fetchCommunitiesAPI({ limit: 100 });
      const communities = communitiesResponse.communities || [];

      // For each community, check if user is a member
      const userCommunities: Community[] = [];
      for (const community of communities) {
        const membership = await checkMembershipAPI(community.id, userId);
        if (membership && membership.status === 'active') {
          userCommunities.push(community);
        }
      }

      return userCommunities;
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.STANDARD,
  });
}
