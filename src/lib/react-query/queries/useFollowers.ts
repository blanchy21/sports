import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES, PAGINATION } from '@/lib/constants/cache';
import { useBroadcast } from '@/hooks/useBroadcast';
import type { FollowRelationship } from '@/types';

// Locally defined — matches the server-side SocialResult interface
// without importing the WASM-dependent social module.
interface SocialResult {
  relationships: FollowRelationship[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

async function fetchFollowersViaApi(
  username: string,
  options: { limit: number; before?: string }
): Promise<SocialResult> {
  const params = new URLSearchParams({
    username,
    limit: options.limit.toString(),
  });
  if (options.before) params.set('before', options.before);

  const response = await fetch(`/api/hive/social/followers?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch followers: ${response.status}`);
  }
  const data = await response.json();
  return {
    relationships: data.relationships ?? [],
    hasMore: data.hasMore ?? false,
    nextCursor: data.nextCursor,
    total: data.total,
  };
}

async function fetchFollowingViaApi(
  username: string,
  options: { limit: number; before?: string }
): Promise<SocialResult> {
  const params = new URLSearchParams({
    username,
    limit: options.limit.toString(),
  });
  if (options.before) params.set('before', options.before);

  const response = await fetch(`/api/hive/social/following?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch following: ${response.status}`);
  }
  const data = await response.json();
  return {
    relationships: data.relationships ?? [],
    hasMore: data.hasMore ?? false,
    nextCursor: data.nextCursor,
    total: data.total,
  };
}

export function useFollowers(username: string, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.users.followers(username)],
    queryFn: ({ pageParam }) =>
      fetchFollowersViaApi(username, {
        limit: PAGINATION.SOCIAL_PAGE_SIZE,
        before: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: SocialResult) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: options.enabled !== undefined ? options.enabled : !!username,
    staleTime: STALE_TIMES.STANDARD,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      // Flatten all pages into a single result for easier consumption
      relationships: data.pages.flatMap((page) => page.relationships),
      hasMore: data.pages[data.pages.length - 1]?.hasMore ?? false,
      total: data.pages[0]?.total,
    }),
  });
}

export function useFollowing(username: string, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.users.following(username)],
    queryFn: ({ pageParam }) =>
      fetchFollowingViaApi(username, {
        limit: PAGINATION.SOCIAL_PAGE_SIZE,
        before: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: SocialResult) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: options.enabled !== undefined ? options.enabled : !!username,
    staleTime: STALE_TIMES.STANDARD,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      // Flatten all pages into a single result for easier consumption
      relationships: data.pages.flatMap((page) => page.relationships),
      hasMore: data.pages[data.pages.length - 1]?.hasMore ?? false,
      total: data.pages[0]?.total,
    }),
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  const { broadcast } = useBroadcast();

  return useMutation({
    mutationFn: async ({ username, follower }: { username: string; follower: string }) => {
      const operations: [string, Record<string, unknown>][] = [
        [
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: [follower],
            id: 'follow',
            json: JSON.stringify(['follow', { follower, following: username, what: ['blog'] }]),
          },
        ],
      ];

      const result = await broadcast(operations, 'posting');
      if (!result.success) {
        throw new Error(result.error || 'Follow transaction failed');
      }
      return result;
    },
    onSuccess: (_, { username, follower }) => {
      // Optimistically update caches so UI updates immediately
      // (Hive nodes may take a few seconds to index the new follow)
      queryClient.setQueriesData<Record<string, boolean>>(
        { queryKey: ['users', 'followStatus'] },
        (old) => (old ? { ...old, [username]: true } : old)
      );
      queryClient.setQueryData(
        [...queryKeys.users.detail(username), 'following', follower],
        true
      );

      // Invalidate follower/following lists and user details
      queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following(follower) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(follower) });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  const { broadcast } = useBroadcast();

  return useMutation({
    mutationFn: async ({ username, follower }: { username: string; follower: string }) => {
      const operations: [string, Record<string, unknown>][] = [
        [
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: [follower],
            id: 'follow',
            json: JSON.stringify(['follow', { follower, following: username, what: [] }]),
          },
        ],
      ];

      const result = await broadcast(operations, 'posting');
      if (!result.success) {
        throw new Error(result.error || 'Unfollow transaction failed');
      }
      return result;
    },
    onSuccess: (_, { username, follower }) => {
      // Optimistically update caches so UI updates immediately
      queryClient.setQueriesData<Record<string, boolean>>(
        { queryKey: ['users', 'followStatus'] },
        (old) => (old ? { ...old, [username]: false } : old)
      );
      queryClient.setQueryData(
        [...queryKeys.users.detail(username), 'following', follower],
        false
      );

      // Invalidate follower/following lists and user details
      queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following(follower) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(follower) });
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
