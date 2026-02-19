import { makeHiveApiCall } from './api';
import { isHiveAccount } from './account';
import { FollowRelationship } from '@/types';
import type { AiohaInstance } from '@/lib/aioha/types';
import {
  workerBee as workerBeeLog,
  warn as logWarn,
  error as logError,
  info as logInfo,
} from './logger';

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
 * Shared helper for follow/unfollow operations.
 * 'follow' sets what: ['blog'], 'unfollow' sets what: [] (empty).
 */
async function toggleFollow(
  username: string,
  follower: string,
  action: 'follow' | 'unfollow'
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return {
      success: false,
      error: `${action} operation must be performed in browser environment`,
    };
  }

  try {
    workerBeeLog(`${action}User start ${follower} -> ${username}`);

    const { aioha } = await import('@/lib/aioha/config');

    if (!aioha) {
      throw new Error(
        'Aioha authentication is not available. Please refresh the page and try again.'
      );
    }

    const followOperation = {
      follower,
      following: username,
      what: action === 'follow' ? ['blog'] : [],
    };

    workerBeeLog(`${action}User operation created`, undefined, followOperation);

    const operations = [
      [
        'custom_json',
        {
          required_auths: [],
          required_posting_auths: [follower],
          id: 'follow_plugin',
          json: JSON.stringify(['follow', followOperation]),
        },
      ],
    ];

    workerBeeLog(`${action}User broadcasting transaction`);
    const result = await (aioha as AiohaInstance).signAndBroadcastTx!(operations, 'posting');

    workerBeeLog(`${action}User broadcast result`, undefined, result);

    if (!result || (result as { error?: string })?.error) {
      throw new Error(
        `Transaction failed: ${(result as { error?: string })?.error || 'Unknown error'}`
      );
    }

    workerBeeLog(`${action}User success ${follower} -> ${username}`);
    return { success: true };
  } catch (error) {
    logError(`Error ${action}ing user`, undefined, error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : String(error);
    workerBeeLog(`${action}User error details`, undefined, {
      message: errorMessage,
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: errorMessage };
  }
}

export async function followUser(
  username: string,
  follower: string
): Promise<{ success: boolean; error?: string }> {
  return toggleFollow(username, follower, 'follow');
}

export async function unfollowUser(
  username: string,
  follower: string
): Promise<{ success: boolean; error?: string }> {
  return toggleFollow(username, follower, 'unfollow');
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

    const result = await makeHiveApiCall<Record<string, unknown>>(
      'bridge',
      'get_relationship_between_accounts',
      [follower, username]
    );

    const isFollowing = result?.follows === true;

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

export async function fetchFollowers(
  username: string,
  filters: SocialFilters = {}
): Promise<SocialResult> {
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
      .filter(
        (rel): rel is Record<string, unknown> & { follower: string; following: string } =>
          typeof rel?.follower === 'string' && typeof rel?.following === 'string'
      )
      .filter((rel) => !start || rel.follower !== start)
      .map((rel) => ({
        follower: rel.follower,
        following: rel.following,
        followedAt:
          (typeof rel.followed_since === 'string' ? rel.followed_since : undefined) ??
          (typeof rel.follow_since === 'string' ? rel.follow_since : undefined) ??
          new Date().toISOString(),
      }));

    const hasMore = result.length === limit;
    const nextCursor =
      hasMore && relationships.length > 0
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
export async function fetchFollowing(
  username: string,
  filters: SocialFilters = {}
): Promise<SocialResult> {
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
      .filter(
        (rel): rel is Record<string, unknown> & { follower: string; following: string } =>
          typeof rel?.follower === 'string' && typeof rel?.following === 'string'
      )
      .filter((rel) => !start || rel.following !== start)
      .map((rel) => ({
        follower: rel.follower,
        following: rel.following,
        followedAt:
          (typeof rel.followed_since === 'string' ? rel.followed_since : undefined) ??
          (typeof rel.follow_since === 'string' ? rel.follow_since : undefined) ??
          new Date().toISOString(),
      }));

    const hasMore = result.length === limit;
    const nextCursor =
      hasMore && relationships.length > 0
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
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    logError(
      `Error fetching following: ${errorMessage}`,
      'getFollowing',
      error instanceof Error ? error : new Error(errorMessage)
    );
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

    // Check if account exists on Hive first (uses cache to avoid repeated API calls)
    // This prevents errors for soft-auth users and deleted accounts
    const exists = await isHiveAccount(username);
    if (!exists) {
      workerBeeLog(`getFollowerCount skipping non-Hive account: ${username}`);
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
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);

    // Handle non-existent accounts gracefully - this is common for soft-auth users
    // or cached posts from accounts that were renamed/deleted
    if (errorMessage.includes('does not exist') || errorMessage.includes('Invalid parameters')) {
      logWarn(`Account "${username}" not found on Hive, returning 0 followers`);
      return 0;
    }

    logError(
      `Error fetching follower count for "${username}": ${errorMessage}`,
      'getFollowerCount',
      error instanceof Error ? error : new Error(errorMessage)
    );
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

    // Check if account exists on Hive first (uses cache to avoid repeated API calls)
    // This prevents errors for soft-auth users and deleted accounts
    const exists = await isHiveAccount(username);
    if (!exists) {
      workerBeeLog(`getFollowingCount skipping non-Hive account: ${username}`);
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
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);

    // Handle non-existent accounts gracefully - this is common for soft-auth users
    // or cached posts from accounts that were renamed/deleted
    if (errorMessage.includes('does not exist') || errorMessage.includes('Invalid parameters')) {
      logWarn(`Account "${username}" not found on Hive, returning 0 following`);
      return 0;
    }

    logError(
      `Error fetching following count for "${username}": ${errorMessage}`,
      'getFollowingCount',
      error instanceof Error ? error : new Error(errorMessage)
    );
    return 0;
  }
}

/**
 * Profile data for updating a Hive account
 */
/**
 * Reblog (repost) a Hive post to the user's own blog
 * @param author - Original post author
 * @param permlink - Original post permlink
 * @param account - Username performing the reblog
 * @returns Reblog result
 */
export async function reblogPost(
  author: string,
  permlink: string,
  account: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return {
      success: false,
      error: 'Reblog operation must be performed in browser environment',
    };
  }

  if (account === author) {
    return {
      success: false,
      error: 'You cannot reblog your own post',
    };
  }

  try {
    workerBeeLog(`reblogPost start ${account} reblogging ${author}/${permlink}`);

    const { aioha } = await import('@/lib/aioha/config');

    if (!aioha) {
      throw new Error(
        'Aioha authentication is not available. Please refresh the page and try again.'
      );
    }

    const operations = [
      [
        'custom_json',
        {
          required_auths: [],
          required_posting_auths: [account],
          id: 'follow',
          json: JSON.stringify(['reblog', { account, author, permlink }]),
        },
      ],
    ];

    workerBeeLog('reblogPost broadcasting transaction');
    const result = await (aioha as AiohaInstance).signAndBroadcastTx!(operations, 'posting');

    workerBeeLog('reblogPost broadcast result', undefined, result);

    if (!result || (result as { error?: string })?.error) {
      throw new Error(
        `Transaction failed: ${(result as { error?: string })?.error || 'Unknown error'}`
      );
    }

    workerBeeLog(`reblogPost success ${account} reblogged ${author}/${permlink}`);

    return {
      success: true,
    };
  } catch (error) {
    logError('Error reblogging post', undefined, error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : String(error);
    workerBeeLog('reblogPost error details', undefined, {
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

export interface ProfileUpdateData {
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  profile_image?: string;
  cover_image?: string;
}

/**
 * Update a Hive user's profile metadata using account_update2
 * This operation only requires posting authority (not active key)
 * @param username - Username to update profile for
 * @param profileData - Profile fields to update
 * @returns Update result with success status
 */
export async function updateHiveProfile(
  username: string,
  profileData: ProfileUpdateData
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return {
      success: false,
      error: 'Profile update must be performed in browser environment',
    };
  }

  try {
    workerBeeLog(`updateHiveProfile start for ${username}`, undefined, profileData);

    // Fetch current account to get existing metadata via direct API call
    // (No WorkerBee initialization needed - this is a simple RPC call)
    const response = await fetch('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [[username]],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status}`);
    }

    const data = await response.json();
    const accounts = data.result as Array<Record<string, unknown>>;

    if (!accounts || accounts.length === 0) {
      throw new Error('Account not found');
    }

    const account = accounts[0];

    // Parse existing posting_json_metadata (this is where profile data lives)
    let existingMetadata: Record<string, unknown> = {};
    try {
      const postingMetadata = account.posting_json_metadata as string;
      if (postingMetadata) {
        existingMetadata = JSON.parse(postingMetadata);
      }
    } catch {
      // If parsing fails, start with empty object
      existingMetadata = {};
    }

    // Merge existing profile with new data
    const existingProfile = (existingMetadata.profile as Record<string, unknown>) || {};
    const updatedProfile: Record<string, unknown> = {
      ...existingProfile,
    };

    // Only update fields that are provided (not undefined)
    if (profileData.name !== undefined) updatedProfile.name = profileData.name;
    if (profileData.about !== undefined) updatedProfile.about = profileData.about;
    if (profileData.location !== undefined) updatedProfile.location = profileData.location;
    if (profileData.website !== undefined) updatedProfile.website = profileData.website;
    if (profileData.profile_image !== undefined)
      updatedProfile.profile_image = profileData.profile_image;
    if (profileData.cover_image !== undefined) updatedProfile.cover_image = profileData.cover_image;

    const updatedMetadata = {
      ...existingMetadata,
      profile: updatedProfile,
    };

    workerBeeLog('updateHiveProfile metadata prepared', undefined, updatedMetadata);

    // Import Aioha to broadcast the transaction
    const { aioha } = await import('@/lib/aioha/config');

    if (!aioha) {
      throw new Error(
        'Aioha authentication is not available. Please refresh the page and try again.'
      );
    }

    // Create account_update2 operation
    // This only requires posting authority when updating posting_json_metadata
    const operations = [
      [
        'account_update2',
        {
          account: username,
          json_metadata: '', // Empty string means don't update
          posting_json_metadata: JSON.stringify(updatedMetadata),
          extensions: [],
        },
      ],
    ];

    workerBeeLog('updateHiveProfile broadcasting transaction', undefined, operations);
    const result = await (aioha as AiohaInstance).signAndBroadcastTx!(operations, 'posting');

    workerBeeLog('updateHiveProfile broadcast result', undefined, result);

    if (!result || (result as { error?: string })?.error) {
      throw new Error(
        `Transaction failed: ${(result as { error?: string })?.error || 'Unknown error'}`
      );
    }

    workerBeeLog(`updateHiveProfile success for ${username}`);

    return {
      success: true,
      transactionId: (result as { id?: string })?.id,
    };
  } catch (error) {
    logError('Error updating profile', undefined, error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : String(error);
    workerBeeLog('updateHiveProfile error details', undefined, {
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
