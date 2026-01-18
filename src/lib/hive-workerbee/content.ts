import { SPORTS_ARENA_CONFIG } from './client';
import { SPORT_CATEGORIES } from '@/types';
import { makeWorkerBeeApiCall } from './api';
import { getContentOptimized } from './optimization';
import { workerBee as workerBeeLog, warn as logWarn, error as logError } from './logger';

interface HiveVote {
  voter: string;
  weight: number;
  rshares: string;
  percent: number;
  reputation: string;
  time: string;
}

interface HivePost {
  id: number;
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  created: string;
  last_update: string;
  depth: number;
  children: number;
  net_votes: number;
  active_votes: HiveVote[];
  pending_payout_value: string;
  total_pending_payout_value: string;
  curator_payout_value: string;
  author_payout_value: string;
  max_accepted_payout: string;
  percent_hbd: number;
  parent_author: string;
  parent_permlink: string;
  author_reputation: string;
}

// Types matching the original content.ts interface
export interface SportsblockPost {
  id: number;
  author: string;
  permlink: string;
  title: string;
  body: string;
  created: string;
  last_update: string;
  depth: number;
  children: number;
  net_votes: number;
  active_votes: HiveVote[];
  pending_payout_value: string;
  total_pending_payout_value: string;
  curator_payout_value: string;
  author_payout_value: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  json_metadata: string;
  parent_author: string;
  parent_permlink: string;
  sportCategory?: string;
  isSportsblockPost: boolean;
}

export interface HiveComment {
  id: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  created: string;
  last_update: string;
  depth: number;
  children: number;
  net_votes: number;
  active_votes: HiveVote[];
  pending_payout_value: string;
  total_pending_payout_value: string;
  curator_payout_value: string;
  author_payout_value: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  json_metadata: string;
  parent_author: string;
  parent_permlink: string;
  author_reputation: string;
}

export interface ContentFilters {
  sportCategory?: string;
  author?: string;
  tag?: string;
  limit?: number;
  sort?: 'trending' | 'created' | 'payout' | 'votes';
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

function isSportsblockPost(post: HivePost): boolean {
  const metadata = parseJsonMetadata(post.json_metadata);
  const tags = metadata.tags as string[] | undefined;
  return tags?.includes('sportsblock') || 
         tags?.includes(SPORTS_ARENA_CONFIG.COMMUNITY_NAME) ||
         post.parent_permlink === SPORTS_ARENA_CONFIG.COMMUNITY_NAME;
}

function getSportCategory(post: HivePost): string | null {
  const metadata = parseJsonMetadata(post.json_metadata);
  
  // First check if sport_category is explicitly set in metadata
  if (metadata.sport_category) {
    return metadata.sport_category as string;
  }
  
  // If not, check tags array for sport names
  const tags = metadata.tags as string[] | undefined;
  if (tags) {
    // Check if any tag matches a sport category
    for (const tag of tags) {
      // Check against known sport categories
      const sportCategory = SPORT_CATEGORIES.find(sport => 
        sport.id === tag || 
        sport.name.toLowerCase() === tag.toLowerCase() ||
        sport.slug === tag
      );
      if (sportCategory) {
        return sportCategory.id;
      }
    }
  }
  
  return null;
}

function calculatePendingPayout(post: HivePost | SportsblockPost): number {
  return parseFloat(post.pending_payout_value || '0');
}

/**
 * Fetch posts from Sportsblock community using WorkerBee/Wax
 * @param filters - Content filters
 * @returns Filtered posts
 */
export async function fetchSportsblockPosts(filters: ContentFilters = {}): Promise<ContentResult> {
  const limit = Math.min(filters.limit || 20, 100); // Max 100 posts per request
  let fetchedAsTrending = false; // Track if we fetched trending posts from API
  
  try {
    let posts: HivePost[] = [];
    
    if (filters.author) {
      // Fetch posts by specific author using optimized caching
      const accountPosts = await getContentOptimized('get_discussions_by_author_before_date', [
        filters.author,
        filters.before || '',
        '',
        limit
      ]);
      posts = (accountPosts || []) as unknown as HivePost[];
    } else if (filters.sort === 'trending') {
      // Use get_discussions_by_trending for trending posts
      // Note: get_discussions_by_trending doesn't support pagination with start_author/start_permlink
      // So we ignore filters.before for trending and always fetch from the top
      const trendingPosts = await getContentOptimized('get_discussions_by_trending', [
        {
          tag: SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
          limit: limit
        }
      ]);
      posts = (trendingPosts || []) as unknown as HivePost[];
      fetchedAsTrending = true; // Mark that we fetched trending posts
    } else {
      // Fetch posts from Sportsblock community using optimized caching
      // For pagination, we need to use get_discussions_by_created with start_author and start_permlink
      if (filters.before) {
        // Parse the cursor to get author and permlink for pagination
        const [author, permlink] = filters.before.split('/');
        
        if (author && permlink) {
          // Use start_author and start_permlink for pagination
          // get_discussions_by_created requires tag, limit, start_author, and start_permlink
          const communityPosts = await getContentOptimized('get_discussions_by_created', [
            {
              tag: SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
              limit: limit,
              start_author: author,
              start_permlink: permlink
            }
          ]);
          posts = (communityPosts || []) as unknown as HivePost[];
        } else {
          // Invalid cursor format, fallback to regular fetch
          // get_discussions_by_created requires tag, limit, start_author, and start_permlink
          const communityPosts = await getContentOptimized('get_discussions_by_created', [
            {
              tag: SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
              limit: limit,
              start_author: '',
              start_permlink: ''
            }
          ]);
          posts = (communityPosts || []) as unknown as HivePost[];
        }
      } else {
        // First page - use get_discussions_by_created for chronological order
        // get_discussions_by_created requires tag, limit, start_author, and start_permlink
        const communityPosts = await getContentOptimized('get_discussions_by_created', [
          {
            tag: SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
            limit: limit,
            start_author: '',
            start_permlink: ''
          }
        ]);
        posts = (communityPosts || []) as unknown as HivePost[];
      }
    }

    // Filter to only Sportsblock posts
    const sportsblockPosts: SportsblockPost[] = posts
      .filter(isSportsblockPost)
      .map((post: HivePost) => ({
        ...post,
        sportCategory: getSportCategory(post) || undefined,
        isSportsblockPost: true,
      } as unknown as SportsblockPost));

    // Apply additional filters
    let filteredPosts = sportsblockPosts;

    if (filters.sportCategory) {
      filteredPosts = filteredPosts.filter(post => 
        post.sportCategory === filters.sportCategory
      );
    }

    if (filters.tag) {
      filteredPosts = filteredPosts.filter(post => {
        const metadata = parseJsonMetadata(post.json_metadata);
        const tags = metadata.tags as string[] | undefined;
        return tags?.includes(filters.tag!);
      });
    }

    // Sort posts (skip if already fetched as trending from API, since API returns them sorted)
    if (!fetchedAsTrending) {
      filteredPosts = sortPosts(filteredPosts, filters.sort || 'created') as SportsblockPost[];
    }

    // Determine if there are more posts
    // Use the original posts length before filtering to determine hasMore
    const hasMore = posts.length === limit;

    // Generate next cursor for pagination
    const nextCursor = hasMore && filteredPosts.length > 0 
      ? `${filteredPosts[filteredPosts.length - 1].author}/${filteredPosts[filteredPosts.length - 1].permlink}`
      : undefined;

    return {
      posts: filteredPosts,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    // Better error handling - convert non-Error instances to Error
    const errorObj = error instanceof Error 
      ? error 
      : new Error(error ? String(error) : 'Unknown error occurred while fetching Sportsblock posts');
    
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
    const trendingPosts = await makeWorkerBeeApiCall<unknown[]>('get_discussions_by_trending', [
      {
        tag: SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
        limit
      }
    ]);

    return ((trendingPosts || []) as unknown as HivePost[])
      .filter(isSportsblockPost)
      .map((post: HivePost) => ({
        ...post,
        sportCategory: getSportCategory(post) || undefined,
        isSportsblockPost: true,
      } as unknown as SportsblockPost));
  } catch (error) {
    logError('Error fetching trending posts with WorkerBee', 'getTrendingPosts', error instanceof Error ? error : undefined);
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
        tag: SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
        limit
      }
    ]);

    return ((hotPosts || []) as unknown as HivePost[])
      .filter(isSportsblockPost)
      .map((post: HivePost) => ({
        ...post,
        sportCategory: getSportCategory(post) || undefined,
        isSportsblockPost: true,
      } as unknown as SportsblockPost));
  } catch (error) {
    logError('Error fetching hot posts with WorkerBee', 'getHotPosts', error instanceof Error ? error : undefined);
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
    
    if (!post || !isSportsblockPost(post as unknown as HivePost)) {
      return null;
    }

    return {
      ...(post as unknown as HivePost),
      sportCategory: getSportCategory(post as unknown as HivePost),
      isSportsblockPost: true,
    } as unknown as SportsblockPost;
  } catch (error) {
    logError('Error fetching post with WorkerBee', 'getPostByAuthorPermlink', error instanceof Error ? error : undefined);
    return null;
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
  try {
    workerBeeLog(`[fetchComments] Fetching comments for ${author}/${permlink}`);
    
    // Use WorkerBee API call for better node management
    // First, get direct replies to the post
    const directReplies = await makeWorkerBeeApiCall<unknown[]>('get_content_replies', [author, permlink]);
    
    workerBeeLog('[fetchComments] Direct replies', undefined, Array.isArray(directReplies) ? directReplies.length : 0);
    
    if (!Array.isArray(directReplies) || directReplies.length === 0) {
      return [];
    }

    // Now get nested replies for each direct reply
    const allComments: unknown[] = [...directReplies];
    
    for (const reply of directReplies) {
      try {
        const replyData = reply as { author: string; permlink: string };
        workerBeeLog(`[fetchComments] Fetching nested replies for ${replyData.author}/${replyData.permlink}`);
        const nestedReplies = await makeWorkerBeeApiCall<unknown[]>('get_content_replies', [replyData.author, replyData.permlink]);
        
        if (Array.isArray(nestedReplies) && nestedReplies.length > 0) {
          workerBeeLog(`[fetchComments] Found ${nestedReplies.length} nested replies for ${replyData.author}/${replyData.permlink}`);
          allComments.push(...nestedReplies);
        }
      } catch (error) {
        const replyData = reply as { author: string; permlink: string };
        logWarn(`[fetchComments] Error fetching nested replies for ${replyData.author}/${replyData.permlink}`, 'fetchComments', error);
        // Continue with other replies even if one fails
      }
    }
    
    workerBeeLog('[fetchComments] Total comments found', undefined, allComments.length);
    workerBeeLog('[fetchComments] All comments', undefined, allComments);
    
    return allComments as unknown as HiveComment[];
  } catch (error) {
    logError('Error fetching comments with WorkerBee', 'fetchComments', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Search posts by keyword using WorkerBee
 * @param query - Search query
 * @param filters - Additional filters
 * @returns Search results
 */
export async function searchPosts(query: string, filters: ContentFilters = {}): Promise<ContentResult> {
  try {
    // Hive doesn't have built-in search, so we'll fetch recent posts and filter
    const allPosts = await fetchSportsblockPosts({ ...filters, limit: 100 });
    
    const searchTerms = query.toLowerCase().split(' ');
    const searchResults = (allPosts.posts as unknown as HivePost[]).filter(post => {
      const searchableText = `${post.title} ${post.body}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    });

    return {
      posts: searchResults as unknown as SportsblockPost[],
      hasMore: false,
    };
  } catch (error) {
    logError('Error searching posts with WorkerBee', 'searchPosts', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get posts by sport category using WorkerBee
 * @param sportCategory - Sport category ID
 * @param limit - Number of posts to fetch
 * @returns Posts in the sport category
 */
export async function getPostsBySport(sportCategory: string, limit: number = 20): Promise<SportsblockPost[]> {
  try {
    const result = await fetchSportsblockPosts({
      sportCategory,
      limit,
      sort: 'created',
    });
    
    return result.posts;
  } catch (error) {
    logError('Error fetching posts by sport with WorkerBee', 'getPostsBySport', error instanceof Error ? error : undefined);
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
export async function getUserPosts(username: string, limit: number = 20): Promise<SportsblockPost[]> {
  try {
    const sportsblockPosts: SportsblockPost[] = [];
    let startPermlink = '';
    const maxPages = 10; // Maximum pages to fetch (10 * 20 = 200 posts max)
    const postsPerPage = 20; // Hive API limit
    
    for (let page = 0; page < maxPages && sportsblockPosts.length < limit; page++) {
      // Fetch a page of user posts
      const accountPosts = await getContentOptimized('get_discussions_by_author_before_date', [
        username,
        startPermlink,
        '',
        postsPerPage
      ]) as HivePost[] | null;
      
      const posts = accountPosts || [];
      
      // No more posts available
      if (posts.length === 0) {
        break;
      }
      
      // Skip the first post on subsequent pages (it's a duplicate from the previous page)
      const newPosts = page === 0 ? posts : posts.slice(1);
      
      if (newPosts.length === 0) {
        break;
      }
      
      // Filter for sportsblock posts and add them
      for (const post of newPosts) {
        if (isSportsblockPost(post)) {
          sportsblockPosts.push({
            ...post,
            sportCategory: getSportCategory(post) || undefined,
            isSportsblockPost: true,
            allow_votes: true,
            allow_curation_rewards: true,
          } as unknown as SportsblockPost);
          
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
    logError('Error fetching user posts with WorkerBee', 'getUserPosts', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get popular tags in Sportsblock using WorkerBee
 * @param limit - Number of tags to fetch
 * @returns Popular tags
 */
export async function getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
  try {
    // Fetch recent posts to analyze tags
    const posts = await fetchSportsblockPosts({ limit: 100 });
    
    const tagCount: Record<string, number> = {};
    
    (posts.posts as unknown as HivePost[]).forEach((post: HivePost) => {
      const metadata = parseJsonMetadata(post.json_metadata);
      const tags = metadata.tags as string[] | undefined;
      if (tags) {
        tags.forEach((tag: string) => {
          if (tag !== 'sportsblock' && tag !== SPORTS_ARENA_CONFIG.COMMUNITY_NAME) {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  } catch (error) {
    logError('Error fetching popular tags with WorkerBee', 'getPopularTags', error instanceof Error ? error : undefined);
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
    
    const authors = new Set((recentPosts.posts as unknown as HivePost[]).map(post => post.author));
    const totalRewards = (recentPosts.posts as unknown as HivePost[]).reduce((sum, post) => {
      return sum + calculatePendingPayout(post);
    }, 0);

    return {
      totalPosts: recentPosts.posts.length,
      totalAuthors: authors.size,
      totalRewards,
      activeToday: recentPosts.posts.filter(post => {
        const postDate = new Date(post.created);
        const today = new Date();
        return postDate.toDateString() === today.toDateString();
      }).length,
    };
  } catch (error) {
    logError('Error fetching community stats with WorkerBee', 'getCommunityStats', error instanceof Error ? error : undefined);
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
export async function getRelatedPosts(post: SportsblockPost, limit: number = 5): Promise<SportsblockPost[]> {
  try {
    const metadata = parseJsonMetadata(post.json_metadata);
    const tags = (metadata.tags as string[]) || [];
    
    // Fetch posts with similar tags or sport category
    const relatedPosts = await fetchSportsblockPosts({
      sportCategory: post.sportCategory || undefined,
      limit: limit * 3, // Fetch more to filter
    });

    // Filter out the original post and rank by similarity
    const filtered = (relatedPosts.posts as unknown as HivePost[])
      .filter(p => p.id !== post.id)
      .map(p => {
        const pMetadata = parseJsonMetadata(p.json_metadata);
        const pTags = (pMetadata.tags as string[]) || [];
        
        // Calculate similarity score
        const commonTags = tags.filter((tag: string) => pTags.includes(tag)).length;
        const similarityScore = commonTags / Math.max(tags.length, pTags.length);
        
        return { post: p, score: similarityScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.post);

    return filtered as unknown as SportsblockPost[];
  } catch (error) {
    logError('Error fetching related posts with WorkerBee', 'getRelatedPosts', error instanceof Error ? error : undefined);
    return [];
  }
}

/**
 * Sort posts based on criteria
 * @param posts - Posts to sort
 * @param sortBy - Sort criteria
 * @returns Sorted posts
 */
function sortPosts(posts: (HivePost | SportsblockPost)[], sortBy: string): (HivePost | SportsblockPost)[] {
  switch (sortBy) {
    case 'trending':
      return posts.sort((a, b) => {
        // Sort by trending score (combination of votes and time)
        const scoreA = a.net_votes * Math.log(Date.now() - new Date(a.created).getTime() + 1);
        const scoreB = b.net_votes * Math.log(Date.now() - new Date(b.created).getTime() + 1);
        return scoreB - scoreA;
      });
    
    case 'payout':
      return posts.sort((a, b) => {
        const payoutA = calculatePendingPayout(a);
        const payoutB = calculatePendingPayout(b);
        return payoutB - payoutA;
      });
    
    case 'votes':
      return posts.sort((a, b) => b.net_votes - a.net_votes);
    
    case 'created':
    default:
      return posts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }
}
