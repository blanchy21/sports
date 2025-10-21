import { getWaxClient, SPORTS_ARENA_CONFIG } from './client';
import { SPORT_CATEGORIES } from '@/types';

// Helper function to make direct HTTP calls to Hive API
// This provides better error handling and fallback options
async function makeHiveApiCall<T = unknown>(api: string, method: string, params: unknown[] = []): Promise<T> {
  // List of Hive API nodes to try in order
  const apiNodes = [
    'https://api.hive.blog',
    'https://api.deathwing.me',
    'https://api.openhive.network',
    'https://hive-api.arcange.eu'
  ];

  let lastError: Error | null = null;

  for (const nodeUrl of apiNodes) {
    try {
      console.log(`[Hive API] Trying ${nodeUrl} for ${api}.${method}`);
      
      const response = await fetch(nodeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: `${api}.${method}`,
          params: params,
          id: Math.floor(Math.random() * 1000000)
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} from ${nodeUrl}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(`API error from ${nodeUrl}: ${result.error.message}`);
      }
      
      console.log(`[Hive API] Success with ${nodeUrl} for ${api}.${method}`);
      return result.result;
    } catch (error) {
      console.warn(`[Hive API] Failed with ${nodeUrl}:`, error);
      lastError = error as Error;
      // Continue to next node
    }
  }

  // If all nodes failed, throw the last error
  throw new Error(`All Hive API nodes failed. Last error: ${lastError?.message}`);
}

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
  try {
    // Get Wax client
    const wax = await getWaxClient();

    const limit = Math.min(filters.limit || 20, 100); // Max 100 posts per request
    let posts: HivePost[] = [];
    
    if (filters.author) {
      // Fetch posts by specific author
      const accountPosts = await makeHiveApiCall('condenser_api', 'get_discussions_by_author_before_date', [
        filters.author,
        filters.before || '',
        '',
        limit
      ]);
      posts = (accountPosts || []) as unknown as HivePost[];
    } else {
      // Fetch posts from Sportsblock community
      // Use the community name instead of ID for get_discussions_by_created
      const communityPosts = await makeHiveApiCall('condenser_api', 'get_discussions_by_created', [
        {
          tag: SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
          limit: limit
        }
      ]);
      posts = (communityPosts || []) as unknown as HivePost[];
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

    // Sort posts
    filteredPosts = sortPosts(filteredPosts, filters.sort || 'created') as SportsblockPost[];

    // Determine if there are more posts
    const hasMore = filteredPosts.length === limit;

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
    console.error('Error fetching Sportsblock posts with WorkerBee:', error);
    throw error;
  }
}

/**
 * Fetch trending posts from Sportsblock using WorkerBee/Wax
 * @param limit - Number of posts to fetch
 * @returns Trending posts
 */
export async function fetchTrendingPosts(limit: number = 20): Promise<SportsblockPost[]> {
  try {
    // Get Wax client
    const wax = await getWaxClient();

    const trendingPosts = await makeHiveApiCall('condenser_api', 'get_discussions_by_trending', [
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
    console.error('Error fetching trending posts with WorkerBee:', error);
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
    // Get Wax client
    const wax = await getWaxClient();

    const hotPosts = await makeHiveApiCall('condenser_api', 'get_discussions_by_hot', [
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
    console.error('Error fetching hot posts with WorkerBee:', error);
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
    // Get Wax client
    const wax = await getWaxClient();

    const post = await makeHiveApiCall('condenser_api', 'get_content', [author, permlink]);
    
    if (!post || !isSportsblockPost(post as unknown as HivePost)) {
      return null;
    }

    return {
      ...(post as unknown as HivePost),
      sportCategory: getSportCategory(post as unknown as HivePost),
      isSportsblockPost: true,
    } as unknown as SportsblockPost;
  } catch (error) {
    console.error('Error fetching post with WorkerBee:', error);
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
export async function fetchComments(author: string, permlink: string, limit: number = 20): Promise<HiveComment[]> {
  try {
    console.log(`[fetchComments] Fetching comments for ${author}/${permlink}`);
    
    // Get Wax client
    const wax = await getWaxClient();

    // First, get direct replies to the post
    const directReplies = await makeHiveApiCall('condenser_api', 'get_content_replies', [author, permlink]);
    
    console.log(`[fetchComments] Direct replies:`, Array.isArray(directReplies) ? directReplies.length : 0);
    
    if (!Array.isArray(directReplies) || directReplies.length === 0) {
      return [];
    }

    // Now get nested replies for each direct reply
    const allComments: unknown[] = [...directReplies];
    
    for (const reply of directReplies) {
      try {
        console.log(`[fetchComments] Fetching nested replies for ${reply.author}/${reply.permlink}`);
        const nestedReplies = await makeHiveApiCall('condenser_api', 'get_content_replies', [reply.author, reply.permlink]);
        
        if (Array.isArray(nestedReplies) && nestedReplies.length > 0) {
          console.log(`[fetchComments] Found ${nestedReplies.length} nested replies for ${reply.author}/${reply.permlink}`);
          allComments.push(...nestedReplies);
        }
      } catch (error) {
        console.warn(`[fetchComments] Error fetching nested replies for ${reply.author}/${reply.permlink}:`, error);
        // Continue with other replies even if one fails
      }
    }
    
    console.log(`[fetchComments] Total comments found:`, allComments.length);
    console.log(`[fetchComments] All comments:`, allComments);
    
    return allComments as unknown as HiveComment[];
  } catch (error) {
    console.error('Error fetching comments with WorkerBee:', error);
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
    console.error('Error searching posts with WorkerBee:', error);
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
    console.error('Error fetching posts by sport with WorkerBee:', error);
    throw error;
  }
}

/**
 * Get user's posts from Sportsblock using WorkerBee
 * @param username - Username
 * @param limit - Number of posts to fetch
 * @returns User's posts
 */
export async function getUserPosts(username: string, limit: number = 20): Promise<SportsblockPost[]> {
  try {
    const result = await fetchSportsblockPosts({
      author: username,
      limit,
      sort: 'created',
    });
    
    return result.posts;
  } catch (error) {
    console.error('Error fetching user posts with WorkerBee:', error);
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
    console.error('Error fetching popular tags with WorkerBee:', error);
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
    // This would require additional API calls or database queries
    // For now, return mock data - implement with actual Hivemind API later
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
    console.error('Error fetching community stats with WorkerBee:', error);
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
    console.error('Error fetching related posts with WorkerBee:', error);
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
