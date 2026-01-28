/**
 * User Profile Hook
 *
 * Uses React Query for proper caching, deduplication, and request management.
 * When multiple PostCards request the same user profile, only one request is made.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile, parseJsonMetadata } from '@/lib/hive-workerbee/account';
import { getAccountsBatch } from '@/lib/hive-workerbee/optimization';

export interface UserProfile {
  username: string;
  displayName?: string;
  avatar?: string;
  reputation?: number;
  reputationFormatted?: string;
}

/**
 * Get the Hive avatar URL for a username
 * This is the standard Hive image service endpoint that works for all users
 */
function getHiveAvatarUrl(username: string): string {
  return `https://images.hive.blog/u/${username}/avatar`;
}

/**
 * Fetch and transform user profile data
 */
async function fetchProfile(username: string): Promise<UserProfile | null> {
  const profileData = await fetchUserProfile(username);
  if (!profileData) {
    // Even if profile fetch fails, return basic profile with Hive avatar
    return {
      username: username,
      displayName: undefined,
      avatar: getHiveAvatarUrl(username),
      reputation: 0,
      reputationFormatted: '0',
    };
  }

  return {
    username: username,
    displayName: profileData.name,
    // Use profile image if available, otherwise fallback to Hive avatar URL
    avatar: profileData.profileImage || getHiveAvatarUrl(username),
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
 * Prefetch multiple user profiles at once using a single batch API call.
 * This dramatically reduces N+1 queries when rendering feeds.
 *
 * The Hive API's get_accounts endpoint accepts an array of usernames,
 * allowing us to fetch all profiles in one request instead of N requests.
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

  if (uniqueUsernames.length === 0) return;

  // Check which usernames are not already in cache
  const uncachedUsernames = uniqueUsernames.filter((username) => {
    const cached = queryClient.getQueryData(['userProfile', username]);
    return cached === undefined;
  });

  if (uncachedUsernames.length === 0) return;

  try {
    // Batch fetch all uncached accounts in a single API call
    const accountsMap = await getAccountsBatch(uncachedUsernames);

    // Transform and populate React Query cache for each account
    for (const [username, accountData] of accountsMap) {
      let profile: UserProfile | null = null;

      if (accountData) {
        // Parse profile from both metadata sources (same as fetchUserProfile)
        const metadata = parseJsonMetadata((accountData.json_metadata as string) || '{}');
        const postingMetadata = parseJsonMetadata(
          (accountData.posting_json_metadata as string) || '{}'
        );
        const profileData = {
          ...(metadata.profile || {}),
          ...(postingMetadata.profile || {}),
        } as {
          name?: string;
          profile_image?: string;
        };

        profile = {
          username,
          displayName: profileData.name,
          avatar: profileData.profile_image || getHiveAvatarUrl(username),
          reputation: 0,
          reputationFormatted: '0',
        };
      }

      // Set in React Query cache
      queryClient.setQueryData(['userProfile', username], profile);
    }
  } catch (error) {
    // Silently fail - individual hooks will fetch on their own
    console.warn('[UserProfile] Batch prefetch failed, falling back to individual queries:', error);
  }
}
