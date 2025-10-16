import { getHiveClient, getAccountInfo, getResourceCredits } from './client';
import { HiveProfileMetadata } from './types';
import { 
  calculateReputation, 
  formatReputation, 
  parseAsset, 
  formatAsset,
  vestingSharesToHive,
  calculateRCPercentage,
  formatResourceCredits,
  hasEnoughRC,
  parseJsonMetadata,
  handleHiveError
} from './utils';
import { PrivateKey } from '@hiveio/dhive';

// Account management functions for Sportsblock platform

export interface UserAccountData {
  username: string;
  reputation: number;
  reputationFormatted: string;
  hiveBalance: number;
  hbdBalance: number;
  hivePower: number;
  resourceCredits: number;
  resourceCreditsFormatted: string;
  hasEnoughRC: boolean;
  profile: {
    name?: string;
    about?: string;
    location?: string;
    website?: string;
    coverImage?: string;
    profileImage?: string;
  };
  stats: {
    postCount: number;
    commentCount: number;
    voteCount: number;
    followers?: number;
    following?: number;
  };
  createdAt: Date;
  lastPost?: Date;
  lastVote?: Date;
  canVote: boolean;
  votingPower: number;
}

/**
 * Fetch complete user account data from Hive
 * @param username - Hive username
 * @returns Complete user account data
 */
export async function fetchUserAccount(username: string): Promise<UserAccountData | null> {
  try {
    console.log(`[fetchUserAccount] Starting fetch for username: ${username}`);
    
    // Add timeout wrapper for the API calls
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API call timeout after 15 seconds')), 15000);
    });

    const apiCallPromise = Promise.all([
      getAccountInfo(username),
      getResourceCredits(username)
    ]);

    const [account, rc, followStats] = await Promise.race([
      Promise.all([
        getAccountInfo(username),
        getResourceCredits(username),
        getUserFollowStats(username)
      ]),
      timeoutPromise
    ]) as [any, any, any];

    console.log(`[fetchUserAccount] Account data received:`, account);
    console.log(`[fetchUserAccount] Resource credits received:`, rc);
    console.log(`[fetchUserAccount] Follow stats received:`, followStats);

    if (!account) {
      console.error(`[fetchUserAccount] Account ${username} not found`);
      throw new Error(`Account ${username} not found`);
    }

    const reputation = calculateReputation(account.reputation);
    const hiveAsset = parseAsset(account.balance);
    const hbdAsset = parseAsset(account.sbd_balance);
    const savingsHiveAsset = parseAsset(account.savings_balance);
    const savingsHbdAsset = parseAsset(account.savings_sbd_balance);

    // Parse profile metadata
    console.log(`[fetchUserAccount] Raw json_metadata:`, account.json_metadata);
    const profileMetadata = parseJsonMetadata(account.json_metadata) as HiveProfileMetadata;
    console.log(`[fetchUserAccount] Parsed profile metadata:`, profileMetadata);
    const profile = profileMetadata.profile || {};
    console.log(`[fetchUserAccount] Profile data:`, profile);

    // Calculate HIVE POWER from vesting shares
    let hivePower = 0;
    if (account.vesting_shares) {
      // Get current global properties for vesting calculation
      const client = getHiveClient();
      const globalProps = await client.database.getDynamicGlobalProperties();
      
      hivePower = vestingSharesToHive(
        account.vesting_shares,
        String(globalProps.total_vesting_shares),
        String(globalProps.total_vesting_fund_hive)
      );
    }

    // Calculate Resource Credits percentage
    const rcPercentage = rc ? calculateRCPercentage(rc) : 0;

    return {
      username: account.name,
      reputation,
      reputationFormatted: formatReputation(reputation),
      hiveBalance: hiveAsset.amount + savingsHiveAsset.amount,
      hbdBalance: hbdAsset.amount + savingsHbdAsset.amount,
      hivePower,
      resourceCredits: rcPercentage,
      resourceCreditsFormatted: rc ? formatResourceCredits(rc) : '0%',
      hasEnoughRC: rc ? hasEnoughRC(rc) : false,
      profile: {
        name: profile.name,
        about: profile.about,
        location: profile.location,
        website: profile.website,
        coverImage: profile.cover_image,
        profileImage: profile.profile_image,
      },
      stats: {
        postCount: account.post_count || 0,
        commentCount: account.comment_count || 0,
        voteCount: account.lifetime_vote_count || 0,
        followers: followStats?.followers || 0,
        following: followStats?.following || 0,
      },
      createdAt: new Date(account.created),
      lastPost: account.last_post ? new Date(account.last_post) : undefined,
      lastVote: account.last_vote_time ? new Date(account.last_vote_time) : undefined,
      canVote: account.can_vote || false,
      votingPower: account.voting_power || 0,
    };
  } catch (error) {
    console.error('Error fetching user account:', error);
    throw error;
  }
}

/**
 * Fetch user balances only (lightweight)
 * @param username - Hive username
 * @returns User balances
 */
export async function fetchUserBalances(username: string): Promise<{
  hiveBalance: number;
  hbdBalance: number;
  hivePower: number;
  resourceCredits: number;
} | null> {
  try {
    const [account, rc] = await Promise.all([
      getAccountInfo(username),
      getResourceCredits(username)
    ]);

    if (!account) return null;

    const hiveAsset = parseAsset(account.balance);
    const hbdAsset = parseAsset(account.sbd_balance);
    const savingsHiveAsset = parseAsset(account.savings_balance);
    const savingsHbdAsset = parseAsset(account.savings_sbd_balance);

    let hivePower = 0;
    if (account.vesting_shares) {
      const client = getHiveClient();
      const globalProps = await client.database.getDynamicGlobalProperties();
      
      hivePower = vestingSharesToHive(
        account.vesting_shares,
        String(globalProps.total_vesting_shares),
        String(globalProps.total_vesting_fund_hive)
      );
    }

    const rcPercentage = rc ? calculateRCPercentage(rc) : 0;

    return {
      hiveBalance: hiveAsset.amount + savingsHiveAsset.amount,
      hbdBalance: hbdAsset.amount + savingsHbdAsset.amount,
      hivePower,
      resourceCredits: rcPercentage,
    };
  } catch (error) {
    console.error('Error fetching user balances:', error);
    return null;
  }
}

/**
 * Fetch user profile metadata only
 * @param username - Hive username
 * @returns User profile data
 */
export async function fetchUserProfile(username: string): Promise<{
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  coverImage?: string;
  profileImage?: string;
} | null> {
  try {
    const account = await getAccountInfo(username);
    if (!account) return null;

    const profileMetadata = parseJsonMetadata(account.json_metadata) as HiveProfileMetadata;
    return profileMetadata.profile || {};
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Check if user exists on Hive blockchain
 * @param username - Username to check
 * @returns True if user exists
 */
export async function userExists(username: string): Promise<boolean> {
  try {
    const account = await getAccountInfo(username);
    return !!account;
  } catch {
    return false;
  }
}

/**
 * Get user's followers and following counts
 * @param username - Hive username
 * @returns Followers and following counts
 */
export async function getUserFollowStats(username: string): Promise<{
  followers: number;
  following: number;
} | null> {
  try {
    console.log(`[getUserFollowStats] Fetching follow stats for: ${username}`);
    const client = getHiveClient();
    
    // Use the correct Hive API methods for follow counts
    const [followersResult, followingResult] = await Promise.allSettled([
      client.database.call('condenser_api.get_follow_count', [username]),
      client.database.call('condenser_api.get_follow_count', [username])
    ]);

    let followers = 0;
    let following = 0;

    if (followersResult.status === 'fulfilled' && followersResult.value) {
      followers = followersResult.value.follower_count || 0;
    }

    if (followingResult.status === 'fulfilled' && followingResult.value) {
      following = followingResult.value.following_count || 0;
    }

    console.log(`[getUserFollowStats] Follow stats: ${followers} followers, ${following} following`);
    
    return {
      followers,
      following
    };
  } catch (error) {
    console.error('Error fetching follow stats:', error);
    return null;
  }
}

/**
 * Get user's recent activity
 * @param username - Hive username
 * @param limit - Number of activities to fetch
 * @returns Recent activities
 */
export async function getUserRecentActivity(username: string, limit: number = 10): Promise<unknown[]> {
  try {
    // This would require additional API calls to get user's recent activities
    // For now, return empty array
    console.log(`Recent activity requested for: ${username}, limit: ${limit}`);
    return [];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Fetch lightweight user profile data for display in posts/comments
 * @param username - Hive username
 * @returns Basic user profile data
 */
export async function fetchUserProfileBasic(username: string): Promise<{
  username: string;
  displayName?: string;
  avatar?: string;
  reputation?: number;
  reputationFormatted?: string;
} | null> {
  try {
    const account = await getAccountInfo(username);
    if (!account) return null;

    const reputation = calculateReputation(account.reputation);
    const profileMetadata = parseJsonMetadata(account.json_metadata) as HiveProfileMetadata;
    const profile = profileMetadata.profile || {};

    return {
      username: account.name,
      displayName: profile.name,
      avatar: profile.profile_image,
      reputation: reputation,
      reputationFormatted: formatReputation(reputation),
    };
  } catch (error) {
    console.error('Error fetching basic user profile:', error);
    return null;
  }
}

/**
 * Update user profile metadata
 * @param username - Username
 * @param profileData - Profile data to update
 * @param postingKey - User's posting key
 * @returns Transaction result
 */
export async function updateUserProfile(
  username: string,
  profileData: {
    name?: string;
    about?: string;
    location?: string;
    website?: string;
    coverImage?: string;
    profileImage?: string;
  },
  postingKey: string | PrivateKey
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const client = getHiveClient();
    
    // Convert string key to PrivateKey object if needed
    const key = typeof postingKey === 'string' ? PrivateKey.from(postingKey) : postingKey;
    
    // Get current account to preserve existing metadata
    const account = await getAccountInfo(username);
    if (!account) throw new Error('Account not found');

    const currentMetadata = parseJsonMetadata(account.json_metadata);
    const currentProfile = currentMetadata.profile || {};

    // Merge with new profile data
    const updatedProfile = {
      ...currentProfile,
      ...profileData,
      version: 2 // Increment version
    };

    const updatedMetadata = {
      ...currentMetadata,
      profile: updatedProfile
    };

    // Create account update operation
    const operation = [
      'account_update',
      {
        account: username,
        json_metadata: JSON.stringify(updatedMetadata),
        posting: account.posting,
        memo_key: account.memo_key,
        owner: account.owner,
        active: account.active,
      }
    ];

    // Broadcast transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await client.broadcast.sendOperations([operation] as any, key);
    return { success: true, transactionId: result.id };
  } catch (error) {
    console.error('Error updating user profile:', error);
    const hiveError = handleHiveError(error);
    return { success: false, error: hiveError.message };
  }
}

/**
 * Get user's delegation information
 * @param username - Hive username
 * @returns Delegation info
 */
export async function getUserDelegations(username: string): Promise<{
  received: Array<{ delegator: string; vesting_shares: string; min_delegation_time: string }>;
  given: Array<{ delegatee: string; vesting_shares: string; min_delegation_time: string }>;
} | null> {
  try {
    const client = getHiveClient();
    
    // Get received delegations
    const receivedDelegations = await client.database.getVestingDelegations(username, '', 100);
    
    // Get given delegations (this might require a different API call)
    const givenDelegations = await client.database.call('get_expiring_vesting_delegations', [username, new Date(), 100]);

    return {
      received: receivedDelegations.map((d) => ({
        delegator: d.delegator,
        vesting_shares: String(d.vesting_shares),
        min_delegation_time: d.min_delegation_time
      })),
      given: givenDelegations.map((d: Record<string, unknown>) => ({
        delegatee: d.delegatee as string,
        vesting_shares: String(d.vesting_shares),
        min_delegation_time: d.min_delegation_time as string
      }))
    };
  } catch (error) {
    console.error('Error fetching delegations:', error);
    return null;
  }
}

/**
 * Format balance for display
 * @param amount - Balance amount
 * @param symbol - Token symbol
 * @returns Formatted balance string
 */
export function formatBalance(amount: number, symbol: string): string {
  if (symbol === 'HIVE') {
    return formatAsset(amount, symbol, 3);
  } else if (symbol === 'HBD') {
    return formatAsset(amount, symbol, 2);
  } else if (symbol === 'HP') {
    return formatAsset(amount, symbol, 1);
  }
  return formatAsset(amount, symbol, 3);
}
