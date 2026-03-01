import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES, getPostStaleTime } from '@/lib/constants/cache';
import { SportsblockPost } from '@/lib/shared/types';
import type { AnyPost, DisplayPost } from '@/lib/utils/post-helpers';

// Locally defined — matches the server-side ContentFilters interface
// without importing the WASM-dependent content module.
interface ContentFilters {
  sportCategory?: string;
  author?: string;
  tag?: string;
  limit?: number;
  sort?: 'trending' | 'hot' | 'created' | 'payout' | 'votes';
  before?: string;
}

// API response type for feed posts
interface FeedPostsResponse {
  success: boolean;
  posts: AnyPost[];
  hasMore: boolean;
  nextCursor?: string;
}

// Unified post type from unified API
interface UnifiedPost {
  id: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  excerpt?: string;
  created: string;
  tags: string[];
  sportCategory?: string;
  featuredImage?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  viewCount?: number;
  likeCount?: number;
  netVotes?: number;
  children?: number;
  pendingPayout?: string;
  source: 'hive' | 'soft';
  isHivePost: boolean;
  isSoftPost: boolean;
  softPostId?: string;
  activeVotes?: Array<{
    voter: string;
    weight: number;
    percent: number;
  }>;
}

// Convert unified post to DisplayPost — only the fields UI components actually use
function unifiedToDisplayPost(post: UnifiedPost): DisplayPost {
  return {
    postType: 'display',
    author: post.author,
    permlink: post.permlink,
    title: post.title,
    body: post.body,
    tags: post.tags,
    featuredImage: post.featuredImage,
    sportCategory: post.sportCategory,
    created: post.created,
    net_votes: post.netVotes || 0,
    children: post.children || 0,
    pending_payout_value: post.pendingPayout,
    active_votes: post.activeVotes,
    authorDisplayName: post.authorDisplayName,
    authorAvatar: post.authorAvatar,
    source: post.source,
    _isSoftPost: post.isSoftPost,
    _softPostId: post.softPostId,
    _likeCount: post.likeCount,
    _viewCount: post.viewCount,
  };
}

// Fetch function for feed posts via unified API route (includes both Hive and soft posts)
async function fetchFeedPosts(params: {
  limit?: number;
  sort?: string;
  sportCategory?: string;
  before?: string;
}): Promise<FeedPostsResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sportCategory) searchParams.set('sportCategory', params.sportCategory);
  if (params.before) searchParams.set('before', params.before);
  // Include both Hive and soft posts in the feed
  searchParams.set('includeHive', 'true');
  searchParams.set('includeSoft', 'true');

  const response = await fetch(`/api/unified/posts?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  const data = await response.json();

  // Convert unified posts to DisplayPost format
  const posts = (data.posts || []).map((p: UnifiedPost) => unifiedToDisplayPost(p));

  return {
    success: data.success,
    posts,
    hasMore: data.hasMore || false,
    nextCursor: data.nextCursor,
  };
}

async function fetchPostsViaApi(filters: ContentFilters): Promise<SportsblockPost[]> {
  const params = new URLSearchParams();
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.sportCategory) params.set('sportCategory', filters.sportCategory);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.before) params.set('before', filters.before);

  const response = await fetch(`/api/hive/posts?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }
  const data = await response.json();
  return data.posts ?? [];
}

async function fetchSinglePostViaApi(
  author: string,
  permlink: string
): Promise<SportsblockPost | null> {
  const params = new URLSearchParams({ author, permlink });
  const response = await fetch(`/api/hive/posts?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.status}`);
  }
  const data = await response.json();
  return data.post ?? null;
}

export function usePosts(filters: ContentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.posts.list(filters as Record<string, unknown>),
    queryFn: () => fetchPostsViaApi(filters),
    staleTime: STALE_TIMES.REALTIME,
  });
}

export function useTrendingPosts(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.posts.list({ sort: 'trending', limit }),
    queryFn: () => fetchPostsViaApi({ sort: 'trending', limit }),
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useHotPosts(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.posts.list({ sort: 'hot', limit }),
    queryFn: () => fetchPostsViaApi({ sort: 'hot', limit }),
    staleTime: STALE_TIMES.STANDARD,
  });
}

/**
 * Fetch a single post by author and permlink.
 *
 * @param author - Post author username
 * @param permlink - Post permlink
 * @param options - Optional configuration
 * @param options.knownCreatedAt - If known from a list view, pass the post creation date
 *                                  to enable smart caching (older posts cache longer)
 */
export function usePost(
  author: string,
  permlink: string,
  options?: { knownCreatedAt?: Date | string }
) {
  // Calculate stale time based on post age if known
  const staleTime = options?.knownCreatedAt
    ? getPostStaleTime(options.knownCreatedAt)
    : STALE_TIMES.STANDARD;

  return useQuery({
    queryKey: queryKeys.posts.detail(`${author}/${permlink}`),
    queryFn: () => fetchSinglePostViaApi(author, permlink),
    enabled: !!author && !!permlink,
    staleTime,
  });
}

export function useInvalidatePosts() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
    invalidateList: (filters?: Record<string, unknown>) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.list(filters || {}) }),
    invalidatePost: (author: string, permlink: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(`${author}/${permlink}`) }),
  };
}

// Fetch following feed from /api/hive/feed
async function fetchFollowingFeedPosts(params: {
  username: string;
  limit?: number;
  startAuthor?: string;
  startPermlink?: string;
}): Promise<FeedPostsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('username', params.username);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.startAuthor) searchParams.set('start_author', params.startAuthor);
  if (params.startPermlink) searchParams.set('start_permlink', params.startPermlink);

  const response = await fetch(`/api/hive/feed?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch following feed: ${response.status}`);
  }

  const data = await response.json();

  return {
    success: data.success,
    posts: data.posts || [],
    hasMore: data.hasMore || false,
    nextCursor: data.nextCursor,
  };
}

// Infinite query hook for following feed (posts from followed accounts)
export function useFollowingFeedPosts(
  options: {
    username?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { username, limit = 10, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.posts.list({ type: 'following', username }),
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      let startAuthor: string | undefined;
      let startPermlink: string | undefined;

      if (cursor) {
        const separatorIndex = cursor.indexOf('/');
        startAuthor = cursor.slice(0, separatorIndex);
        startPermlink = cursor.slice(separatorIndex + 1);
      }

      return fetchFollowingFeedPosts({
        username: username!,
        limit,
        startAuthor,
        startPermlink,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: STALE_TIMES.REALTIME,
    enabled: enabled && !!username,
  });
}

// Infinite query hook for feed with pagination
export function useFeedPosts(
  options: {
    sportCategory?: string;
    limit?: number;
    sort?: string;
    enabled?: boolean;
  } = {}
) {
  const { sportCategory, limit = 10, sort = 'created', enabled = true } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.posts.list({ type: 'feed', sportCategory, sort }),
    queryFn: ({ pageParam }) =>
      fetchFeedPosts({
        limit,
        sort,
        sportCategory,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: STALE_TIMES.REALTIME,
    enabled,
  });
}
