import { initializeWorkerBeeClient } from './client';
import { makeHiveApiCall } from './api';
import { FollowRelationship } from '@/types';

export interface SocialFilters {
  limit?: number;
  before?: string; // For pagination
}

export interface SocialResult {
  relationships: FollowRelationship[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

/**
 * Follow a user
 * @param username - Username to follow
 * @param follower - Username of the follower
 * @returns Follow result
 */
export async function followUser(username: string, follower: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return {
      success: false,
      error: 'Follow operation must be performed in browser environment'
    };
  }

  try {
    console.log(`[followUser] Starting follow operation: ${follower} -> ${username}`);
    await initializeWorkerBeeClient();

    // Skip relationship checking since get_relationships API is not available
    // We'll proceed directly to the follow operation
    console.log(`[followUser] Skipping relationship check - proceeding with follow operation`);

    // Import Aioha to broadcast the transaction
    const { aioha } = await import('@/lib/aioha/config');
    
    if (!aioha) {
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    // Create follow operation
    // Hive follow operations use specific format: [follow_type, { follower, following, what }]
    // where 'what' is an array of strings like ['blog'] or ['blog', 'ignore']
    const followOperation = {
      follower: follower,
      following: username,
      what: ['blog'] // 'blog' means following their content, empty array means unfollow
    };

    console.log('[followUser] Follow operation created:', followOperation);

    // Use Aioha to sign and broadcast the transaction
    const operations = [
      ['custom_json', {
        required_auths: [],
        required_posting_auths: [follower],
        id: 'follow_plugin',
        json: JSON.stringify([
          'follow',
          followOperation
        ])
      }]
    ];
    
    console.log('[followUser] Attempting to sign and broadcast transaction...');
    const result = await (aioha as { signAndBroadcastTx: (ops: unknown[], keyType: string) => Promise<unknown> }).signAndBroadcastTx(operations, 'posting');
    
    console.log('[followUser] Broadcast result:', result);

    if (!result || (result as { error?: string })?.error) {
      throw new Error(`Transaction failed: ${(result as { error?: string })?.error || 'Unknown error'}`);
    }

    console.log(`[followUser] ${follower} is now following ${username}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error following user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Full error details:', {
      message: errorMessage,
      error: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Unfollow a user
 * @param username - Username to unfollow
 * @param follower - Username of the follower
 * @returns Unfollow result
 */
export async function unfollowUser(username: string, follower: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return {
      success: false,
      error: 'Unfollow operation must be performed in browser environment'
    };
  }

  try {
    console.log(`[unfollowUser] Starting unfollow operation: ${follower} -> ${username}`);
    await initializeWorkerBeeClient();

    // Skip relationship checking since get_relationships API is not available
    // We'll proceed directly to the unfollow operation
    console.log(`[unfollowUser] Skipping relationship check - proceeding with unfollow operation`);

    // Import Aioha to broadcast the transaction
    const { aioha } = await import('@/lib/aioha/config');
    
    if (!aioha) {
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    // Create unfollow operation (empty 'what' array means unfollow)
    const unfollowOperation = {
      follower: follower,
      following: username,
      what: [] // Empty array means unfollow
    };

    console.log('[unfollowUser] Unfollow operation created:', unfollowOperation);

    // Use Aioha to sign and broadcast the transaction
    const operations = [
      ['custom_json', {
        required_auths: [],
        required_posting_auths: [follower],
        id: 'follow_plugin',
        json: JSON.stringify([
          'follow',
          unfollowOperation
        ])
      }]
    ];
    
    console.log('[unfollowUser] Attempting to sign and broadcast transaction...');
    const result = await (aioha as { signAndBroadcastTx: (ops: unknown[], keyType: string) => Promise<unknown> }).signAndBroadcastTx(operations, 'posting');
    
    console.log('[unfollowUser] Broadcast result:', result);

    if (!result || (result as { error?: string })?.error) {
      throw new Error(`Transaction failed: ${(result as { error?: string })?.error || 'Unknown error'}`);
    }

    console.log(`[unfollowUser] ${follower} is no longer following ${username}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Full error details:', {
      message: errorMessage,
      error: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if user is following another user
 * @param username - Username to check
 * @param follower - Username of the potential follower
 * @returns Following status
 */
export async function isFollowingUser(username: string, follower: string): Promise<boolean> {
  try {
    console.log(`[isFollowingUser] Checking if ${follower} is following ${username}`);

    if (!username || !follower) {
      console.log('[isFollowingUser] Missing username or follower');
      return false;
    }

    const result = await makeHiveApiCall<Array<Record<string, unknown>>>(
      'condenser_api',
      'get_following',
      [follower, username, 'blog', 1]
    );

    const isFollowing = Array.isArray(result)
      && result.some(
        (rel) =>
          typeof rel?.following === 'string'
          && typeof rel?.follower === 'string'
          && rel.following === username
          && rel.follower === follower
      );

    console.log(`[isFollowingUser] Result: ${isFollowing}`);
    return isFollowing;
  } catch (error) {
    console.error('[isFollowingUser] Error checking follow status:', error);
    return false;
  }
}

/**
 * Fetch user's followers
 * @param username - Username to get followers for
 * @param filters - Filters for pagination
 * @returns Followers list
 */
const MAX_FOLLOW_PAGE_SIZE = 100;

export async function fetchFollowers(username: string, filters: SocialFilters = {}): Promise<SocialResult> {
  try {
    console.log(`[fetchFollowers] Fetching followers for ${username}`, filters);

    if (!username) {
      return { relationships: [], hasMore: false };
    }

    const limit = Math.min(Math.max(filters.limit ?? 100, 1), MAX_FOLLOW_PAGE_SIZE);
    const start = filters.before ?? '';

    const result = await makeHiveApiCall<Array<Record<string, unknown>>>(
      'condenser_api',
      'get_followers',
      [username, start, 'blog', limit]
    );

    if (!Array.isArray(result)) {
      console.warn('[fetchFollowers] Unexpected response format', result);
      return { relationships: [], hasMore: false };
    }

    const relationships = result
      .filter((rel) => typeof rel?.follower === 'string' && typeof rel?.following === 'string')
      .filter((rel) => !start || rel?.follower !== start)
      .map((rel) => ({
        follower: rel!.follower as string,
        following: rel!.following as string,
        followedAt:
          (rel!.followed_since as string | undefined)
          || (rel!.follow_since as string | undefined)
          || new Date().toISOString(),
      }));

    const hasMore = result.length === limit;
    const nextCursor = hasMore && relationships.length > 0
      ? relationships[relationships.length - 1]?.follower
      : undefined;
    const total = !start ? await getFollowerCount(username) : undefined;

    return {
      relationships,
      hasMore,
      nextCursor,
      total,
    };
  } catch (error) {
    console.error('Error fetching followers:', error);
    return {
      relationships: [],
      hasMore: false,
    };
  }
}

/**
 * Fetch users that a user is following
 * @param username - Username to get following for
 * @param filters - Filters for pagination
 * @returns Following list
 */
export async function fetchFollowing(username: string, filters: SocialFilters = {}): Promise<SocialResult> {
  try {
    console.log(`[fetchFollowing] Fetching following for ${username}`, filters);

    if (!username) {
      return { relationships: [], hasMore: false };
    }

    const limit = Math.min(Math.max(filters.limit ?? 100, 1), MAX_FOLLOW_PAGE_SIZE);
    const start = filters.before ?? '';

    const result = await makeHiveApiCall<Array<Record<string, unknown>>>(
      'condenser_api',
      'get_following',
      [username, start, 'blog', limit]
    );

    if (!Array.isArray(result)) {
      console.warn('[fetchFollowing] Unexpected response format', result);
      return { relationships: [], hasMore: false };
    }

    const relationships = result
      .filter((rel) => typeof rel?.follower === 'string' && typeof rel?.following === 'string')
      .filter((rel) => !start || rel?.following !== start)
      .map((rel) => ({
        follower: rel!.follower as string,
        following: rel!.following as string,
        followedAt:
          (rel!.followed_since as string | undefined)
          || (rel!.follow_since as string | undefined)
          || new Date().toISOString(),
      }));

    const hasMore = result.length === limit;
    const nextCursor = hasMore && relationships.length > 0
      ? relationships[relationships.length - 1]?.following
      : undefined;
    const total = !start ? await getFollowingCount(username) : undefined;

    return {
      relationships,
      hasMore,
      nextCursor,
      total,
    };
  } catch (error) {
    console.error('Error fetching following:', error);
    return {
      relationships: [],
      hasMore: false,
    };
  }
}

/**
 * Get follower count for a user
 * @param username - Username to get count for
 * @returns Follower count
 */
export async function getFollowerCount(username: string): Promise<number> {
  try {
    console.log(`[getFollowerCount] Getting follower count for ${username}`);

    if (!username) {
      return 0;
    }

    const result = await makeHiveApiCall<Record<string, unknown>>(
      'condenser_api',
      'get_follow_count',
      [username]
    );

    const count = typeof result?.follower_count === 'number' ? result.follower_count : 0;
    console.log(`[getFollowerCount] ${username} has ${count} followers`);
    return count;
  } catch (error) {
    console.error('Error fetching follower count:', error);
    return 0;
  }
}

/**
 * Get following count for a user
 * @param username - Username to get count for
 * @returns Following count
 */
export async function getFollowingCount(username: string): Promise<number> {
  try {
    console.log(`[getFollowingCount] Getting following count for ${username}`);

    if (!username) {
      return 0;
    }

    const result = await makeHiveApiCall<Record<string, unknown>>(
      'condenser_api',
      'get_follow_count',
      [username]
    );

    const count = typeof result?.following_count === 'number' ? result.following_count : 0;
    console.log(`[getFollowingCount] ${username} is following ${count} accounts`);
    return count;
  } catch (error) {
    console.error('Error fetching following count:', error);
    return 0;
  }
}
