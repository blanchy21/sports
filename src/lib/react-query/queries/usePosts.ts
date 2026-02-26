import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import {
  fetchSportsblockPosts,
  fetchTrendingPosts,
  fetchHotPosts,
  fetchPost,
} from '@/lib/hive-workerbee/content';
import { ContentFilters } from '@/lib/hive-workerbee/content';
import { STALE_TIMES, getPostStaleTime } from '@/lib/constants/cache';
import { SportsblockPost } from '@/lib/shared/types';

// API response type for feed posts
interface FeedPostsResponse {
  success: boolean;
  posts: SportsblockPost[];
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

// Convert unified post to SportsblockPost format for component compatibility
function unifiedToSportsblockPost(post: UnifiedPost): SportsblockPost {
  return {
    id: 0, // Not used for display
    author: post.author,
    permlink: post.permlink,
    title: post.title,
    body: post.body,
    created: post.created,
    category: '',
    parent_author: '',
    parent_permlink: '',
    json_metadata: JSON.stringify({
      tags: post.tags,
      image: post.featuredImage ? [post.featuredImage] : [],
      sport_category: post.sportCategory,
    }),
    last_update: post.created,
    active: post.created,
    last_payout: '',
    depth: 0,
    children: post.children || 0,
    net_rshares: '0',
    abs_rshares: '0',
    vote_rshares: '0',
    children_abs_rshares: '0',
    cashout_time: '',
    max_cashout_time: '',
    total_vote_weight: '0',
    reward_weight: 100,
    total_payout_value: '0.000 HBD',
    curator_payout_value: '0.000 HBD',
    author_rewards: '0',
    net_votes: post.netVotes || 0,
    root_author: post.author,
    root_permlink: post.permlink,
    max_accepted_payout: '1000000.000 HBD',
    percent_hbd: 10000,
    allow_replies: true,
    allow_votes: true,
    allow_curation_rewards: true,
    beneficiaries: [],
    url: `/@${post.author}/${post.permlink}`,
    root_title: post.title,
    pending_payout_value: post.pendingPayout || '0.000 HBD',
    total_pending_payout_value: post.pendingPayout || '0.000 HBD',
    active_votes: (post.activeVotes || []).map((v) => ({
      ...v,
      rshares: '0',
      reputation: '0',
      time: post.created,
    })),
    replies: [],
    author_reputation: '0',
    promoted: '0.000 HBD',
    body_length: post.body.length,
    reblogged_by: [],
    tags: post.tags,
    img_url: post.featuredImage,
    sport_category: post.sportCategory,
    sportCategory: post.sportCategory,
    postType: post.isHivePost ? 'sportsblock' : ('soft' as 'sportsblock'),
    isSportsblockPost: post.isHivePost,
    // Custom fields for soft posts
    _isSoftPost: post.isSoftPost,
    _softPostId: post.softPostId,
    _likeCount: post.likeCount,
    _viewCount: post.viewCount,
  } as SportsblockPost;
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

  // Convert unified posts to SportsblockPost format
  const posts = (data.posts || []).map((p: UnifiedPost) => unifiedToSportsblockPost(p));

  return {
    success: data.success,
    posts,
    hasMore: data.hasMore || false,
    nextCursor: data.nextCursor,
  };
}

export function usePosts(filters: ContentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.posts.list(filters as Record<string, unknown>),
    queryFn: () => fetchSportsblockPosts(filters),
    staleTime: STALE_TIMES.REALTIME,
  });
}

export function useTrendingPosts(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.posts.list({ sort: 'trending', limit }),
    queryFn: () => fetchTrendingPosts(limit),
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useHotPosts(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.posts.list({ sort: 'hot', limit }),
    queryFn: () => fetchHotPosts(limit),
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
    queryFn: () => fetchPost(author, permlink),
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
