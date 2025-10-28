import { initializeWorkerBeeClient } from './client';
import { FollowRelationship } from '@/types';
import { makeHiveApiCall } from './api';

export interface SocialFilters {
  limit?: number;
  before?: string; // For pagination
}

export interface SocialResult {
  relationships: FollowRelationship[];
  hasMore: boolean;
  nextCursor?: string;
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

    // Check if already following
    // get_relationships takes: [follower_list, following_list, type]
    const relationships = await makeHiveApiCall<Array<{ follower: string; following: string; what: string[] }>>(
      'condenser_api',
      'get_relationships',
      [[follower], [username]]
    );

    const isAlreadyFollowing = relationships?.some(r => 
      r.follower === follower && 
      r.following === username && 
      r.what?.includes('blog')
    );

    if (isAlreadyFollowing) {
      console.log(`[followUser] ${follower} is already following ${username}`);
      return { success: true };
    }

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
        id: 'follow',
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

    // Check current following status
    // get_relationships takes: [follower_list, following_list, type]
    const relationships = await makeHiveApiCall<Array<{ follower: string; following: string; what: string[] }>>(
      'condenser_api',
      'get_relationships',
      [[follower], [username]]
    );

    const isFollowing = relationships?.some(r => 
      r.follower === follower && 
      r.following === username && 
      r.what?.includes('blog')
    );

    if (!isFollowing) {
      console.log(`[unfollowUser] ${follower} is not following ${username}`);
      return { success: true };
    }

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
        id: 'follow',
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
    
    // Validate inputs
    if (!username || !follower) {
      console.log('[isFollowingUser] Missing username or follower');
      return false;
    }
    
    await initializeWorkerBeeClient();

    // Use Hive's get_relationships API to check if follower is following username
    // get_relationships takes: [follower_list, following_list, type]
    const relationships = await makeHiveApiCall<Array<{ follower: string; following: string; what: string[] }>>(
      'condenser_api',
      'get_relationships',
      [[follower], [username]]
    );

    console.log(`[isFollowingUser] API returned:`, relationships);

    const isFollowing = relationships?.some(r => 
      r.follower === follower && 
      r.following === username && 
      r.what?.includes('blog')
    );

    console.log(`[isFollowingUser] Result: ${follower} ${isFollowing ? 'is' : 'is not'} following ${username}`);
    return isFollowing || false;
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
export async function fetchFollowers(username: string, filters: SocialFilters = {}): Promise<SocialResult> {
  try {
    await initializeWorkerBeeClient();

    const limit = Math.min(filters.limit || 20, 100);
    
    // Use Hive's get_followers API
    const result = await makeHiveApiCall<{ follower: string; following: string; what: string[] }[]>(
      'condenser_api',
      'get_followers',
      [username, '', 'blog', limit]
    );

    const followers: FollowRelationship[] = (result || []).map(r => ({
      follower: r.follower,
      following: username,
      followedAt: new Date().toISOString(), // Hive API doesn't return timestamps
    }));

    return {
      relationships: followers,
      hasMore: followers.length === limit,
      nextCursor: followers.length > 0 ? followers[followers.length - 1]?.follower : undefined,
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
    await initializeWorkerBeeClient();

    const limit = Math.min(filters.limit || 20, 100);
    
    // Use Hive's get_following API
    const result = await makeHiveApiCall<{ follower: string; following: string; what: string[] }[]>(
      'condenser_api',
      'get_following',
      [username, '', 'blog', limit]
    );

    const following: FollowRelationship[] = (result || []).map(r => ({
      follower: username,
      following: r.following,
      followedAt: new Date().toISOString(), // Hive API doesn't return timestamps
    }));

    return {
      relationships: following,
      hasMore: following.length === limit,
      nextCursor: following.length > 0 ? following[following.length - 1]?.following : undefined,
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
    await initializeWorkerBeeClient();

    // Use get_follow_count API
    const result = await makeHiveApiCall<{ follower_count?: number; following_count?: number }>(
      'condenser_api',
      'get_follow_count',
      [username]
    );

    return result?.follower_count || 0;
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
    await initializeWorkerBeeClient();

    // Use get_follow_count API
    const result = await makeHiveApiCall<{ follower_count?: number; following_count?: number }>(
      'condenser_api',
      'get_follow_count',
      [username]
    );

    return result?.following_count || 0;
  } catch (error) {
    console.error('Error fetching following count:', error);
    return 0;
  }
}
