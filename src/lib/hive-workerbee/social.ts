import { initializeWorkerBeeClient } from './client';
import { makeHiveApiCall } from './api';
import { FollowRelationship } from '@/types';
import { workerBee as workerBeeLog, warn as logWarn, error as logError, info as logInfo } from './logger';

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
    workerBeeLog(`followUser start ${follower} -> ${username}`);
    await initializeWorkerBeeClient();

    // Skip relationship checking since get_relationships API is not available
    // We'll proceed directly to the follow operation
    workerBeeLog('followUser skipping relationship check (API unavailable)');

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

    workerBeeLog('followUser operation created', undefined, followOperation);

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
    
    workerBeeLog('followUser broadcasting transaction');
    const result = await (aioha as { signAndBroadcastTx: (ops: unknown[], keyType: string) => Promise<unknown> }).signAndBroadcastTx(operations, 'posting');
    
    workerBeeLog('followUser broadcast result', undefined, result);

    if (!result || (result as { error?: string })?.error) {
      throw new Error(`Transaction failed: ${(result as { error?: string })?.error || 'Unknown error'}`);
    }

    workerBeeLog(`followUser success ${follower} -> ${username}`);
    
    return {
      success: true,
    };
  } catch (error) {
    logError('Error following user', undefined, error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : String(error);
    workerBeeLog('followUser error details', undefined, {
      message: errorMessage,
      error,
      stack: error instanceof Error ? error.stack : undefined,
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
    workerBeeLog(`unfollowUser start ${follower} -> ${username}`);
    await initializeWorkerBeeClient();

    // Skip relationship checking since get_relationships API is not available
    // We'll proceed directly to the unfollow operation
    workerBeeLog('unfollowUser skipping relationship check (API unavailable)');

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

    workerBeeLog('unfollowUser operation created', undefined, unfollowOperation);

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
    
    workerBeeLog('unfollowUser broadcasting transaction');
    const result = await (aioha as { signAndBroadcastTx: (ops: unknown[], keyType: string) => Promise<unknown> }).signAndBroadcastTx(operations, 'posting');
    
    workerBeeLog('unfollowUser broadcast result', undefined, result);

    if (!result || (result as { error?: string })?.error) {
      throw new Error(`Transaction failed: ${(result as { error?: string })?.error || 'Unknown error'}`);
    }

    workerBeeLog(`unfollowUser success ${follower} -> ${username}`);
    
    return {
      success: true,
    };
  } catch (error) {
    logError('Error unfollowing user', undefined, error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : String(error);
    workerBeeLog('unfollowUser error details', undefined, {
      message: errorMessage,
      error,
      stack: error instanceof Error ? error.stack : undefined,
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
    workerBeeLog(`isFollowingUser check ${follower} -> ${username}`);

    if (!username || !follower) {
      logWarn('isFollowingUser called with missing username or follower');
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

    workerBeeLog(`isFollowingUser result ${follower} -> ${username}`, undefined, { isFollowing });
    return isFollowing;
  } catch (error) {
    logError('Error checking follow status', undefined, error instanceof Error ? error : undefined);
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
    workerBeeLog(`fetchFollowers start for ${username}`, undefined, filters);

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
      logWarn('fetchFollowers unexpected response format', undefined, result);
      return { relationships: [], hasMore: false };
    }

    const relationships = result
      .filter((rel): rel is Record<string, unknown> & { follower: string; following: string } =>
        typeof rel?.follower === 'string' && typeof rel?.following === 'string')
      .filter((rel) => !start || rel.follower !== start)
      .map((rel) => ({
        follower: rel.follower,
        following: rel.following,
        followedAt:
          (typeof rel.followed_since === 'string' ? rel.followed_since : undefined)
          ?? (typeof rel.follow_since === 'string' ? rel.follow_since : undefined)
          ?? new Date().toISOString(),
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
    logError('Error fetching followers', undefined, error instanceof Error ? error : undefined);
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
    workerBeeLog(`fetchFollowing start for ${username}`, undefined, filters);

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
      logWarn('fetchFollowing unexpected response format', undefined, result);
      return { relationships: [], hasMore: false };
    }

    const relationships = result
      .filter((rel): rel is Record<string, unknown> & { follower: string; following: string } =>
        typeof rel?.follower === 'string' && typeof rel?.following === 'string')
      .filter((rel) => !start || rel.following !== start)
      .map((rel) => ({
        follower: rel.follower,
        following: rel.following,
        followedAt:
          (typeof rel.followed_since === 'string' ? rel.followed_since : undefined)
          ?? (typeof rel.follow_since === 'string' ? rel.follow_since : undefined)
          ?? new Date().toISOString(),
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
    logError('Error fetching following', undefined, error instanceof Error ? error : undefined);
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
    workerBeeLog(`getFollowerCount start for ${username}`);

    if (!username) {
      return 0;
    }

    const result = await makeHiveApiCall<Record<string, unknown>>(
      'condenser_api',
      'get_follow_count',
      [username]
    );

    const count = typeof result?.follower_count === 'number' ? result.follower_count : 0;
    logInfo(`getFollowerCount found ${count} followers for ${username}`);
    return count;
  } catch (error) {
    logError('Error fetching follower count', undefined, error instanceof Error ? error : undefined);
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
    workerBeeLog(`getFollowingCount start for ${username}`);

    if (!username) {
      return 0;
    }

    const result = await makeHiveApiCall<Record<string, unknown>>(
      'condenser_api',
      'get_follow_count',
      [username]
    );

    const count = typeof result?.following_count === 'number' ? result.following_count : 0;
    logInfo(`getFollowingCount found ${count} accounts for ${username}`);
    return count;
  } catch (error) {
    logError('Error fetching following count', undefined, error instanceof Error ? error : undefined);
    return 0;
  }
}
