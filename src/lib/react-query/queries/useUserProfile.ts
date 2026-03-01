import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { STALE_TIMES } from '@/lib/constants/cache';

/**
 * Local type matching the API response shape from /api/hive/account/summary.
 * Defined here to avoid importing from the server-only account module.
 */
export interface UserAccountData {
  username: string;
  reputation: number;
  reputationFormatted: string;
  liquidHiveBalance: number;
  liquidHbdBalance: number;
  savingsHiveBalance: number;
  savingsHbdBalance: number;
  hiveBalance: number;
  hbdBalance: number;
  hivePower: number;
  resourceCredits: number;
  resourceCreditsFormatted: string;
  hasEnoughRC: boolean;
  savingsApr?: number;
  pendingWithdrawals?: Array<{
    id: string;
    amount: string;
    to: string;
    memo: string;
    requestId: number;
    from: string;
    timestamp: string;
  }>;
  profile: {
    name?: string;
    about?: string;
    location?: string;
    website?: string;
    coverImage?: string;
    profileImage?: string;
  };
  stats: {
    postCount: number;
    commentCount: number;
    voteCount: number;
    followers?: number;
    following?: number;
  };
  createdAt: string;
  lastPost?: string;
  lastVote?: string;
  canVote: boolean;
  votingPower: number;
}

/**
 * Lightweight profile data for cards and avatars
 */
export interface UserProfileCard {
  username: string;
  displayName?: string;
  avatar?: string;
  reputation?: number;
  reputationFormatted?: string;
}

async function fetchAccountViaApi(username: string): Promise<UserAccountData | null> {
  const response = await fetch(
    `/api/hive/account/summary?username=${encodeURIComponent(username)}`
  );
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch account: ${response.status}`);
  }
  const data = await response.json();
  return data.success ? (data.account as UserAccountData) : null;
}

/**
 * Full user profile hook — returns complete UserAccountData.
 * Used by profile pages and modals that need balances, stats, etc.
 */
export function useUserProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(username),
    queryFn: () => fetchAccountViaApi(username),
    enabled: !!username,
    staleTime: STALE_TIMES.STANDARD,
  });
}

/**
 * Lightweight user profile hook for cards and avatars.
 * Shares the same cache as useUserProfile via `select`.
 */
export function useUserProfileCard(username: string | null) {
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.users.detail(username!),
    queryFn: () => fetchAccountViaApi(username!),
    enabled: !!username,
    staleTime: STALE_TIMES.STANDARD,
    // Don't refetch on window focus for card profiles
    refetchOnWindowFocus: false,
    retry: 1,
    select: (data): UserProfileCard | null => {
      if (!data) return null;
      return {
        username: data.username,
        displayName: data.profile?.name,
        avatar: data.profile?.profileImage || getHiveAvatarUrl(data.username),
        reputation: data.reputation,
        reputationFormatted: data.reputationFormatted,
      };
    },
  });

  return {
    profile: profile ?? null,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load profile') : null,
    refetch,
  };
}

/**
 * Batch prefetch user profiles using parallel API requests.
 * Populates the React Query cache so individual useUserProfile/useUserProfileCard
 * hooks get instant cache hits.
 */
export async function prefetchUserProfiles(
  usernames: string[],
  queryClient: QueryClient
): Promise<void> {
  const uniqueUsernames = [...new Set(usernames.filter(Boolean))];
  if (uniqueUsernames.length === 0) return;

  // Only fetch usernames not already cached
  const uncachedUsernames = uniqueUsernames.filter((username) => {
    const cached = queryClient.getQueryData(queryKeys.users.detail(username));
    return cached === undefined;
  });

  if (uncachedUsernames.length === 0) return;

  try {
    const results = await Promise.allSettled(
      uncachedUsernames.map((username) => fetchAccountViaApi(username))
    );

    for (let i = 0; i < uncachedUsernames.length; i++) {
      const result = results[i];
      if (result.status !== 'fulfilled' || !result.value) continue;
      queryClient.setQueryData(queryKeys.users.detail(uncachedUsernames[i]), result.value);
    }
  } catch (error) {
    // Silently fail — individual hooks will fetch on their own
    console.warn('[UserProfile] Batch prefetch failed:', error);
  }
}

export function useUserFollowerCount(username: string) {
  return useQuery({
    queryKey: [...queryKeys.users.followers(username), 'count'],
    queryFn: async () => {
      const account = await fetchAccountViaApi(username);
      return account?.stats?.followers ?? 0;
    },
    enabled: !!username,
    staleTime: STALE_TIMES.STABLE,
  });
}

export function useUserFollowingCount(username: string) {
  return useQuery({
    queryKey: [...queryKeys.users.following(username), 'count'],
    queryFn: async () => {
      const account = await fetchAccountViaApi(username);
      return account?.stats?.following ?? 0;
    },
    enabled: !!username,
    staleTime: STALE_TIMES.STABLE,
  });
}

export function useIsFollowingUser(username: string, follower: string) {
  return useQuery({
    queryKey: [...queryKeys.users.detail(username), 'following', follower],
    queryFn: async (): Promise<boolean> => {
      const params = new URLSearchParams({ follower, targets: username });
      const response = await fetch(`/api/hive/follows?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch follow status');
      }
      const data = await response.json();
      return data.followStatus?.[username] ?? false;
    },
    enabled: !!username && !!follower,
    staleTime: STALE_TIMES.REALTIME,
  });
}

/**
 * Batch check follow status for multiple targets via server-side API route.
 * Returns a Record<string, boolean> mapping each target to follow status.
 */
export function useBatchFollowStatus(targets: string[], follower: string) {
  const sortedTargets = [...targets].sort();
  return useQuery({
    queryKey: ['users', 'followStatus', follower, sortedTargets],
    queryFn: async (): Promise<Record<string, boolean>> => {
      const params = new URLSearchParams({
        follower,
        targets: sortedTargets.join(','),
      });
      const response = await fetch(`/api/hive/follows?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch follow status');
      }
      const data = await response.json();
      return data.followStatus ?? {};
    },
    enabled: sortedTargets.length > 0 && !!follower,
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
