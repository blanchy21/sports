import { SPORTS_ARENA_CONFIG, MUTED_AUTHORS } from './client';
import { SPORT_CATEGORIES, type SportCategory } from '@/types';
import { makeWorkerBeeApiCall } from './api';
import { getContentOptimized } from './optimization';
import { workerBee as workerBeeLog, warn as logWarn, error as logError } from './logger';
import {
  HivePost,
  HiveComment,
  SportsblockPost,
  toHivePosts,
  toHiveComments,
  toSportsblockPost,
  isHivePost,
} from '@/lib/shared/types';
import {
  validateHivePosts,
  validateHiveComments,
  validatePostData,
} from '@/lib/validation/hive-schemas';

// Re-export types for backwards compatibility
export type { SportsblockPost, HiveComment } from '@/lib/shared/types';

export interface ContentFilters {
  sportCategory?: string;
  author?: string;
  tag?: string;
  limit?: number;
  sort?: 'trending' | 'hot' | 'created' | 'payout' | 'votes';
  before?: string; // For pagination
}

export interface ContentResult {
  posts: SportsblockPost[];
  hasMore: boolean;
  nextCursor?: string;
}

// Utility functions
function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Check if a post belongs to the Sportsblock community
 */
function isSportsblockCommunityPost(post: HivePost): boolean {
  // Primary check: category field is the reliable community indicator from condenser_api
  if (post.category === SPORTS_ARENA_CONFIG.COMMUNITY_ID) {
    return true;
  }
  // Fallback for older posts: check tags and parent_permlink
  const metadata = parseJsonMetadata(post.json_metadata);
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  return (
    tags.includes('sportsblock') ||
    tags.includes(SPORTS_ARENA_CONFIG.COMMUNITY_ID) ||
    post.parent_permlink === SPORTS_ARENA_CONFIG.COMMUNITY_ID
  );
}

/**
 * Get the sport category from a post's metadata
 */
function getSportCategory(post: HivePost): string | null {
  const metadata = parseJsonMetadata(post.json_metadata);

  // First check if sport_category is explicitly set in metadata
  if (typeof metadata.sport_category === 'string') {
    return metadata.sport_category;
  }

  // If not, check tags array for sport names
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    // Check against known sport categories
    const lowerTag = tag.toLowerCase();
    const sportCategory = SPORT_CATEGORIES.find(
      (sport: SportCategory) =>
        sport.id === lowerTag ||
        sport.name.toLowerCase() === lowerTag ||
        sport.slug === lowerTag ||
        sport.aliases?.includes(lowerTag)
    );
    if (sportCategory) {
      return sportCategory.id;
    }
  }

  return null;
}

/**
 * Calculate pending payout from a post
 */
function calculatePendingPayout(post: HivePost | SportsblockPost): number {
  return parseFloat(post.pending_payout_value || '0');
}

/**
 * Convert API response to typed HivePost array with Zod validation
 * Validates each post at runtime, filtering out invalid entries
 */
function toTypedHivePosts(data: unknown): HivePost[] {
  // First validate with Zod schema for runtime type safety
  const validatedPosts = Array.isArray(data) ? validateHivePosts(data) : [];
  // Then transform to application types
  return toHivePosts(validatedPosts);
}

/**
 * Container content_types used by SportsBites / Match Threads.
 * These are structural wrapper posts — not user content — so they
 * should never appear in regular Sportsblock feeds.
 */
const CONTAINER_CONTENT_TYPES = new Set(['sportsbites-container', 'match-thread-container']);

function isContainerPost(post: HivePost): boolean {
  const metadata = parseJsonMetadata(post.json_metadata);
  return (
    typeof metadata.content_type === 'string' && CONTAINER_CONTENT_TYPES.has(metadata.content_type)
  );
}

/**
 * Convert HivePost array to SportsblockPost array,
 * filtering only sportsblock community posts
 */
function toTypedSportsblockPosts(posts: HivePost[]): SportsblockPost[] {
  return posts
    .filter(isSportsblockCommunityPost)
    .filter((post) => !MUTED_AUTHORS.includes(post.author))
    .filter((post) => !isContainerPost(post))
    .map((post) => toSportsblockPost(post, getSportCategory(post)));
}

// Hive API enforces a max limit of 20 per discussion query
const HIVE_API_MAX_LIMIT = 20;

/**
 * Paginated fetch for get_discussions_by_created.
 * Makes multiple API calls (each capped at 20) to collect up to `totalLimit` posts.
 * The Hive API cursor is exclusive — results start AFTER start_author/start_permlink.
 */
async function fetchCreatedPaginated(
  tag: string,
  totalLimit: number,
  startAuthor: string = '',
  startPermlink: string = ''
): Promise<HivePost[]> {
  const allPosts: HivePost[] = [];
  let cursorAuthor = startAuthor;
  let cursorPermlink = startPermlink;

  while (allPosts.length < totalLimit) {
    const remaining = totalLimit - allPosts.length;
    const batchLimit = Math.min(HIVE_API_MAX_LIMIT, remaining);

    const result = await getContentOptimized('get_discussions_by_created', [
      {
        tag,
        limit: batchLimit,
        start_author: cursorAuthor,
        start_permlink: cursorPermlink,
      },
    ]);

    const batch = toTypedHivePosts(result);
    if (batch.length === 0) break;

    allPosts.push(...batch);

    // Set cursor for next page
    const lastPost = batch[batch.length - 1];
    cursorAuthor = lastPost.author;
    cursorPermlink = lastPost.permlink;

    // If we got fewer than requested, no more pages
    if (batch.length < batchLimit) break;
  }

  return allPosts.slice(0, totalLimit);
}

/**
 * Paginated fetch for get_discussions_by_trending.
 * Like fetchCreatedPaginated, makes multiple batches to collect enough posts
 * when client-side filtering (e.g. sport category) would otherwise starve results.
 */
async function fetchTrendingPaginated(
  tag: string,
  totalLimit: number,
  startAuthor: string = '',
  startPermlink: string = ''
): Promise<HivePost[]> {
  const allPosts: HivePost[] = [];
  let cursorAuthor = startAuthor;
  let cursorPermlink = startPermlink;

  while (allPosts.length < totalLimit) {
    const remaining = totalLimit - allPosts.length;
    const batchLimit = Math.min(HIVE_API_MAX_LIMIT, remaining);

    const result = await getContentOptimized('get_discussions_by_trending', [
      {
        tag,
        limit: batchLimit,
        start_author: cursorAuthor,
        start_permlink: cursorPermlink,
      },
    ]);

    const batch = toTypedHivePosts(result);
    if (batch.length === 0) break;

    allPosts.push(...batch);

    // Set cursor for next page
    const lastPost = batch[batch.length - 1];
    cursorAuthor = lastPost.author;
    cursorPermlink = lastPost.permlink;

    // If we got fewer than requested, no more pages
    if (batch.length < batchLimit) break;
  }

  return allPosts.slice(0, totalLimit);
}

/**
 * Paginated fetcher for hot posts using get_discussions_by_hot.
 * Same pattern as fetchTrendingPaginated.
 */
async function fetchHotPaginated(
  tag: string,
  totalLimit: number,
  startAuthor: string = '',
  startPermlink: string = ''
): Promise<HivePost[]> {
  const allPosts: HivePost[] = [];
  let cursorAuthor = startAuthor;
  let cursorPermlink = startPermlink;

  while (allPosts.length < totalLimit) {
    const remaining = totalLimit - allPosts.length;
    const batchLimit = Math.min(HIVE_API_MAX_LIMIT, remaining);

    const result = await getContentOptimized('get_discussions_by_hot', [
      {
        tag,
        limit: batchLimit,
        start_author: cursorAuthor,
        start_permlink: cursorPermlink,
      },
    ]);

    const batch = toTypedHivePosts(result);
    if (batch.length === 0) break;

    allPosts.push(...batch);

    const lastPost = batch[batch.length - 1];
    cursorAuthor = lastPost.author;
    cursorPermlink = lastPost.permlink;

    if (batch.length < batchLimit) break;
  }

  return allPosts.slice(0, totalLimit);
}

/**
 * Fetch posts from Sportsblock community using WorkerBee/Wax
 * @param filters - Content filters
 * @returns Filtered posts
 */
export async function fetchSportsblockPosts(filters: ContentFilters = {}): Promise<ContentResult> {
  const limit = Math.min(filters.limit || 20, 500); // Max 500 posts per request
  let fetchedAsSorted = false; // Track if we fetched pre-sorted posts from API

  try {
    let posts: HivePost[] = [];

    if (filters.author) {
      // Fetch posts by specific author — paginate in batches of 20
      // Params: [author, start_permlink, before_date, limit] — cursor is exclusive
      const allAuthorPosts: HivePost[] = [];
      let cursorPermlink = filters.before || '';
      let remaining = limit;

      while (remaining > 0) {
        const batchLimit = Math.min(HIVE_API_MAX_LIMIT, remaining);
        const accountPosts = await getContentOptimized('get_discussions_by_author_before_date', [
          filters.author,
          cursorPermlink,
          '',
          batchLimit,
        ]);
        const batch = toTypedHivePosts(accountPosts);
        if (batch.length === 0) break;

        allAuthorPosts.push(...batch);
        remaining -= batch.length;

        // Set cursor for next batch
        cursorPermlink = batch[batch.length - 1].permlink || '';
        if (batch.length < batchLimit) break;
      }
      posts = allAuthorPosts.slice(0, limit);
    } else if (filters.sort === 'trending' || filters.sort === 'hot') {
      const paginateFn = filters.sort === 'trending' ? fetchTrendingPaginated : fetchHotPaginated;
      if (filters.sportCategory) {
        const rawLimit = Math.max(limit, 100);
        posts = await paginateFn(SPORTS_ARENA_CONFIG.COMMUNITY_ID, rawLimit);
      } else {
        const rawLimit = Math.max(limit * 3, 30);
        posts = await paginateFn(SPORTS_ARENA_CONFIG.COMMUNITY_ID, rawLimit);
      }
      fetchedAsSorted = true;
    } else {
      // Chronological fetch with automatic pagination
      // Over-fetch to compensate for posts removed by filters (container posts, muted authors)
      const rawLimit = Math.max(limit * 3, 30);
      if (filters.before) {
        const separatorIndex = filters.before.indexOf('/');
        const author = filters.before.slice(0, separatorIndex);
        const permlink = filters.before.slice(separatorIndex + 1);

        if (author && permlink) {
          posts = await fetchCreatedPaginated(
            SPORTS_ARENA_CONFIG.COMMUNITY_ID,
            rawLimit,
            author,
            permlink
          );
        } else {
          posts = await fetchCreatedPaginated(SPORTS_ARENA_CONFIG.COMMUNITY_ID, rawLimit);
        }
      } else {
        posts = await fetchCreatedPaginated(SPORTS_ARENA_CONFIG.COMMUNITY_ID, rawLimit);
      }
    }

    // Filter to only Sportsblock posts and transform
    const sportsblockPosts = toTypedSportsblockPosts(posts);

    // Apply additional filters
    let filteredPosts = sportsblockPosts;

    if (filters.sportCategory) {
      filteredPosts = filteredPosts.filter((post) => post.sportCategory === filters.sportCategory);
    }

    if (filters.tag) {
      filteredPosts = filteredPosts.filter((post) => {
        const metadata = parseJsonMetadata(post.json_metadata);
        const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
        return tags.includes(filters.tag!);
      });
    }

    // Sort posts (skip if already fetched as trending from API, since API returns them sorted)
    if (!fetchedAsSorted) {
      filteredPosts = sortPosts(filteredPosts, filters.sort || 'created') as SportsblockPost[];
    }

    // We over-fetch raw posts, so hasMore is true if we have more filtered posts than requested
    const hasMore = filteredPosts.length > limit;

    // Trim to requested limit
    const resultPosts = filteredPosts.slice(0, limit);

    // Generate next cursor from the last *unfiltered* post that corresponds to our last result,
    // since the Hive API paginates on the unfiltered stream
    const lastResultPost = resultPosts[resultPosts.length - 1];
    let nextCursor: string | undefined;
    if (hasMore && lastResultPost && posts.length > 0) {
      // Find the raw post index that matches or follows our last filtered result
      const lastResultIdx = posts.findIndex(
        (p) => p.author === lastResultPost.author && p.permlink === lastResultPost.permlink
      );
      // Use that raw post as the cursor so pagination resumes from the right spot
      const cursorPost = lastResultIdx >= 0 ? posts[lastResultIdx] : posts[posts.length - 1];
      nextCursor = `${cursorPost.author}/${cursorPost.permlink}`;
    }

    return {
      posts: resultPosts,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    // Better error handling - convert non-Error instances to Error
    const errorObj =
      error instanceof Error
        ? error
        : new Error(
            error ? String(error) : 'Unknown error occurred while fetching Sportsblock posts'
          );

    // Log with more context including filters used
    logError(
      `Error fetching Sportsblock posts with WorkerBee: ${errorObj.message}`,
      'fetchSportsblockPosts',
      errorObj,
      { filters, limit }
    );

    // Re-throw as Error instance for consistent error handling
    throw errorObj;
  }
}

/**
 * Fetch trending posts from Sportsblock using WorkerBee/Wax
 * @param limit - Number of posts to fetch
 * @returns Trending posts
 */
export async function fetchTrendingPosts(limit: number = 20): Promise<SportsblockPost[]> {
  try {
    // Use WorkerBee API call for better node management
    // Hive API caps discussion queries at 20
    const trendingPosts = await makeWorkerBeeApiCall<unknown[]>('get_discussions_by_trending', [
      {
        tag: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
        limit: Math.min(limit, HIVE_API_MAX_LIMIT),
      },
    ]);

    return toTypedSportsblockPosts(toTypedHivePosts(trendingPosts));
  } catch (error) {
    logError(
      'Error fetching trending posts with WorkerBee',
      'getTrendingPosts',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Fetch hot posts from Sportsblock using WorkerBee/Wax
 * @param limit - Number of posts to fetch
 * @returns Hot posts
 */
export async function fetchHotPosts(limit: number = 20): Promise<SportsblockPost[]> {
  try {
    // Use WorkerBee API call for better node management
    const hotPosts = await makeWorkerBeeApiCall<unknown[]>('get_discussions_by_hot', [
      {
        tag: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
        limit: Math.min(limit, HIVE_API_MAX_LIMIT),
      },
    ]);

    return toTypedSportsblockPosts(toTypedHivePosts(hotPosts));
  } catch (error) {
    logError(
      'Error fetching hot posts with WorkerBee',
      'getHotPosts',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Fetch a single post by author and permlink using WorkerBee/Wax
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Post data
 */
export async function fetchPost(author: string, permlink: string): Promise<SportsblockPost | null> {
  try {
    // Use WorkerBee API call for better node management
    const post = await makeWorkerBeeApiCall<unknown>('get_content', [author, permlink]);

    // Validate with Zod schema for runtime type safety
    const validatedPost = validatePostData(post);
    if (!validatedPost) {
      return null;
    }

    // Transform to HivePost type and verify structure
    if (!isHivePost(validatedPost)) {
      return null;
    }

    return toSportsblockPost(validatedPost, getSportCategory(validatedPost));
  } catch (error) {
    logError(
      'Error fetching post with WorkerBee',
      'getPostByAuthorPermlink',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Fetch comments for a post using WorkerBee/Wax
 * @param author - Post author
 * @param permlink - Post permlink
 * @param limit - Number of comments to fetch
 * @returns Comments
 */
export async function fetchComments(author: string, permlink: string): Promise<HiveComment[]> {
  const MAX_DEPTH = 10; // Safety cap to prevent runaway recursion

  try {
    workerBeeLog(`[fetchComments] Fetching comments for ${author}/${permlink}`);

    // Queue-based iterative approach: fetch replies for every comment with children > 0
    const allComments: unknown[] = [];
    const queue: Array<{ author: string; permlink: string; depth: number }> = [
      { author, permlink, depth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth > MAX_DEPTH) {
        workerBeeLog(
          `[fetchComments] Skipping depth ${current.depth} for ${current.author}/${current.permlink} (max depth reached)`
        );
        continue;
      }

      try {
        const replies = await makeWorkerBeeApiCall<unknown[]>('get_content_replies', [
          current.author,
          current.permlink,
        ]);

        if (!Array.isArray(replies) || replies.length === 0) {
          continue;
        }

        // depth 0 = the root post itself, its replies are the top-level comments
        workerBeeLog(
          `[fetchComments] Found ${replies.length} replies at depth ${current.depth} for ${current.author}/${current.permlink}`
        );

        for (const reply of replies) {
          allComments.push(reply);

          // Queue this reply for further fetching if it has children
          const replyData = reply as { author: string; permlink: string; children: number };
          if (replyData.children > 0) {
            queue.push({
              author: replyData.author,
              permlink: replyData.permlink,
              depth: current.depth + 1,
            });
          }
        }
      } catch (error) {
        logWarn(
          `[fetchComments] Error fetching replies for ${current.author}/${current.permlink} at depth ${current.depth}`,
          'fetchComments',
          error
        );
        // Continue with other items in queue even if one fails
      }
    }

    workerBeeLog('[fetchComments] Total comments found', undefined, allComments.length);

    // Validate with Zod schema for runtime type safety, then transform
    const validatedComments = validateHiveComments(allComments);
    return toHiveComments(validatedComments).filter(
      (comment) => !MUTED_AUTHORS.includes(comment.author)
    );
  } catch (error) {
    logError(
      'Error fetching comments with WorkerBee',
      'fetchComments',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Search posts by keyword using WorkerBee
 * @param query - Search query
 * @param filters - Additional filters
 * @returns Search results
 */
export async function searchPosts(
  query: string,
  filters: ContentFilters = {}
): Promise<ContentResult> {
  try {
    // Hive doesn't have built-in search, so we'll fetch recent posts and filter
    const allPosts = await fetchSportsblockPosts({ ...filters, limit: 100 });

    const searchTerms = query.toLowerCase().split(' ');
    const searchResults = allPosts.posts.filter((post) => {
      const searchableText = `${post.title} ${post.body}`.toLowerCase();
      return searchTerms.some((term) => searchableText.includes(term));
    });

    return {
      posts: searchResults,
      hasMore: false,
    };
  } catch (error) {
    logError(
      'Error searching posts with WorkerBee',
      'searchPosts',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Get posts by sport category using WorkerBee
 * @param sportCategory - Sport category ID
 * @param limit - Number of posts to fetch
 * @returns Posts in the sport category
 */
export async function getPostsBySport(
  sportCategory: string,
  limit: number = 20
): Promise<SportsblockPost[]> {
  try {
    const result = await fetchSportsblockPosts({
      sportCategory,
      limit,
      sort: 'created',
    });

    return result.posts;
  } catch (error) {
    logError(
      'Error fetching posts by sport with WorkerBee',
      'getPostsBySport',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Get user's posts from Sportsblock using WorkerBee
 * This function paginates through the user's posts until it finds enough sportsblock posts
 * @param username - Username
 * @param limit - Number of sportsblock posts to find
 * @returns User's sportsblock posts
 */
export async function getUserPosts(
  username: string,
  limit: number = 20,
  startPermlink: string = ''
): Promise<SportsblockPost[]> {
  try {
    const sportsblockPosts: SportsblockPost[] = [];
    const maxPages = 10; // Maximum pages to fetch (10 * 20 = 200 posts max)
    const postsPerPage = 20; // Hive API limit

    for (let page = 0; page < maxPages && sportsblockPosts.length < limit; page++) {
      // Fetch a page of user posts
      const accountPosts = await getContentOptimized('get_discussions_by_author_before_date', [
        username,
        startPermlink,
        '',
        postsPerPage,
      ]);

      const posts = toTypedHivePosts(accountPosts);

      // No more posts available
      if (posts.length === 0) {
        break;
      }

      // Skip the first post when resuming from a cursor (inclusive API — cursor post is a duplicate).
      // This applies to subsequent internal pages AND the first page when called with an external cursor.
      const hasCursor = page > 0 || (page === 0 && startPermlink !== '');
      const newPosts = hasCursor ? posts.slice(1) : posts;

      if (newPosts.length === 0) {
        break;
      }

      // Filter for sportsblock posts and add them
      for (const post of newPosts) {
        if (isSportsblockCommunityPost(post)) {
          sportsblockPosts.push(toSportsblockPost(post, getSportCategory(post)));

          // Stop if we have enough
          if (sportsblockPosts.length >= limit) {
            break;
          }
        }
      }

      // Set up pagination for the next page
      startPermlink = posts[posts.length - 1].permlink;

      // If we got fewer posts than requested, we've reached the end
      if (posts.length < postsPerPage) {
        break;
      }
    }

    return sportsblockPosts;
  } catch (error) {
    logError(
      'Error fetching user posts with WorkerBee',
      'getUserPosts',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Get popular tags in Sportsblock using WorkerBee
 * @param limit - Number of tags to fetch
 * @returns Popular tags
 */
export async function getPopularTags(
  limit: number = 20
): Promise<Array<{ tag: string; count: number }>> {
  try {
    // Fetch recent posts to analyze tags
    const posts = await fetchSportsblockPosts({ limit: 100 });

    const tagCount: Record<string, number> = {};

    posts.posts.forEach((post) => {
      const metadata = parseJsonMetadata(post.json_metadata);
      const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
      tags.forEach((tag) => {
        if (
          typeof tag === 'string' &&
          tag !== 'sportsblock' &&
          tag !== SPORTS_ARENA_CONFIG.COMMUNITY_NAME &&
          tag !== SPORTS_ARENA_CONFIG.COMMUNITY_ID
        ) {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      });
    });

    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  } catch (error) {
    logError(
      'Error fetching popular tags with WorkerBee',
      'getPopularTags',
      error instanceof Error ? error : undefined
    );
    return [];
  }
}

/**
 * Get community statistics using WorkerBee
 * @returns Community stats
 */
export async function getCommunityStats(): Promise<{
  totalPosts: number;
  totalAuthors: number;
  totalRewards: number;
  activeToday: number;
}> {
  try {
    // Fetch recent posts to calculate stats
    const recentPosts = await fetchSportsblockPosts({ limit: 100 });

    const authors = new Set(recentPosts.posts.map((post) => post.author));
    const totalRewards = recentPosts.posts.reduce((sum, post) => {
      return sum + calculatePendingPayout(post);
    }, 0);

    return {
      totalPosts: recentPosts.posts.length,
      totalAuthors: authors.size,
      totalRewards,
      activeToday: recentPosts.posts.filter((post) => {
        const postDate = new Date(post.created);
        const today = new Date();
        return postDate.toDateString() === today.toDateString();
      }).length,
    };
  } catch (error) {
    logError(
      'Error fetching community stats with WorkerBee',
      'getCommunityStats',
      error instanceof Error ? error : undefined
    );
    return {
      totalPosts: 0,
      totalAuthors: 0,
      totalRewards: 0,
      activeToday: 0,
    };
  }
}

/**
 * Get related posts based on tags and sport category using WorkerBee
 * @param post - Reference post
 * @param limit - Number of related posts
 * @returns Related posts
 */
export async function getRelatedPosts(
  post: SportsblockPost,
  limit: number = 5
): Promise<SportsblockPost[]> {
  try {
    const metadata = parseJsonMetadata(post.json_metadata);
    const tags: string[] = Array.isArray(metadata.tags)
      ? metadata.tags.filter((t): t is string => typeof t === 'string')
      : [];

    // Fetch posts with similar tags or sport category
    const relatedPosts = await fetchSportsblockPosts({
      sportCategory: post.sportCategory || undefined,
      limit: limit * 3, // Fetch more to filter
    });

    // Filter out the original post and rank by similarity
    const filtered = relatedPosts.posts
      .filter((p) => p.id !== post.id)
      .map((p) => {
        const pMetadata = parseJsonMetadata(p.json_metadata);
        const pTags: string[] = Array.isArray(pMetadata.tags)
          ? pMetadata.tags.filter((t): t is string => typeof t === 'string')
          : [];

        // Calculate similarity score
        const commonTags = tags.filter((tag) => pTags.includes(tag)).length;
        const similarityScore = commonTags / Math.max(tags.length, pTags.length, 1);

        return { post: p, score: similarityScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.post);

    return filtered;
  } catch (error) {
    logError(
      'Error fetching related posts with WorkerBee',
      'getRelatedPosts',
      error instanceof Error ? error : undefined
    );
    return [];
  }
}

/**
 * Fetch posts from accounts a user follows (their personalised feed).
 * Uses `get_discussions_by_feed` — Hive does the heavy lifting.
 *
 * @param username - The user whose feed to fetch
 * @param limit - Number of posts to return (max 20 per Hive API)
 * @param startAuthor - Cursor: author of the last post from previous page
 * @param startPermlink - Cursor: permlink of the last post from previous page
 */
export async function fetchFollowingFeed(
  username: string,
  limit: number = 20,
  startAuthor: string = '',
  startPermlink: string = ''
): Promise<ContentResult> {
  try {
    const fetchLimit = Math.min(limit + 1, HIVE_API_MAX_LIMIT); // over-fetch by 1 to detect hasMore

    const params: Record<string, unknown> = {
      account: username,
      limit: fetchLimit,
    };
    if (startAuthor && startPermlink) {
      params.start_author = startAuthor;
      params.start_permlink = startPermlink;
    }

    const result = await getContentOptimized('get_discussions_by_feed', [params]);

    const rawPosts = toTypedHivePosts(result);
    const sportsblockPosts = toTypedSportsblockPosts(rawPosts);

    const hasMore = sportsblockPosts.length > limit;
    const resultPosts = sportsblockPosts.slice(0, limit);

    const lastPost = resultPosts[resultPosts.length - 1];
    const nextCursor = hasMore && lastPost ? `${lastPost.author}/${lastPost.permlink}` : undefined;

    return { posts: resultPosts, hasMore, nextCursor };
  } catch (error) {
    logError(
      `Error fetching following feed for ${username}`,
      'fetchFollowingFeed',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Sort posts based on criteria
 * @param posts - Posts to sort
 * @param sortBy - Sort criteria
 * @returns Sorted posts
 */
function sortPosts(
  posts: (HivePost | SportsblockPost)[],
  sortBy: string
): (HivePost | SportsblockPost)[] {
  switch (sortBy) {
    case 'trending':
      return [...posts].sort((a, b) => {
        // Time-decay trending: recent posts with votes rank higher
        const ageA = (Date.now() - new Date(a.created).getTime()) / 3600000; // hours
        const ageB = (Date.now() - new Date(b.created).getTime()) / 3600000;
        const scoreA = Math.max(a.net_votes, 0) / Math.pow(ageA + 2, 1.5);
        const scoreB = Math.max(b.net_votes, 0) / Math.pow(ageB + 2, 1.5);
        return scoreB - scoreA;
      });

    case 'payout':
      return [...posts].sort((a, b) => {
        const payoutA = calculatePendingPayout(a);
        const payoutB = calculatePendingPayout(b);
        return payoutB - payoutA;
      });

    case 'votes':
      return [...posts].sort((a, b) => b.net_votes - a.net_votes);

    case 'created':
    default:
      return [...posts].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );
  }
}
