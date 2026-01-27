/**
 * User Profile Hook
 *
 * Uses React Query for proper caching, deduplication, and request management.
 * When multiple PostCards request the same user profile, only one request is made.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '@/lib/hive-workerbee/account';

export interface UserProfile {
  username: string;
  displayName?: string;
  avatar?: string;
  reputation?: number;
  reputationFormatted?: string;
}

/**
 * Fetch and transform user profile data
 */
async function fetchProfile(username: string): Promise<UserProfile | null> {
  const profileData = await fetchUserProfile(username);
  if (!profileData) {
    return null;
  }

  return {
    username: username,
    displayName: profileData.name,
    avatar: profileData.profileImage,
    reputation: 0,
    reputationFormatted: '0',
  };
}

/**
 * Hook to fetch Hive user profile with React Query caching
 *
 * Benefits:
 * - Automatic request deduplication (multiple components requesting same user = 1 request)
 * - Configurable stale time and cache time
 * - Background refetching
 * - Error handling
 *
 * @param username - Hive username to fetch profile for (null to skip)
 */
export function useUserProfile(username: string | null) {
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userProfile', username],
    queryFn: () => fetchProfile(username!),
    enabled: !!username,
    // Cache profile for 5 minutes before marking stale
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
    // Don't refetch on window focus for profiles (they don't change often)
    refetchOnWindowFocus: false,
    // Retry once on failure
    retry: 1,
  });

  return {
    profile: profile ?? null,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load profile') : null,
    refetch,
  };
}

/**
 * Prefetch multiple user profiles at once
 * Use this at the list level to batch prefetch all authors
 *
 * @param usernames - Array of usernames to prefetch
 * @param queryClient - React Query client instance
 */
export async function prefetchUserProfiles(
  usernames: string[],
  queryClient: import('@tanstack/react-query').QueryClient
): Promise<void> {
  // Deduplicate usernames
  const uniqueUsernames = [...new Set(usernames.filter(Boolean))];

  // Prefetch all profiles in parallel
  await Promise.allSettled(
    uniqueUsernames.map((username) =>
      queryClient.prefetchQuery({
        queryKey: ['userProfile', username],
        queryFn: () => fetchProfile(username),
        staleTime: 5 * 60 * 1000,
      })
    )
  );
}
