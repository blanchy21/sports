import { initializeWorkerBeeClient } from './client';

// Helper function to make direct HTTP calls to Hive API
async function makeHiveApiCall(api: string, method: string, params: any[] = []): Promise<any> {
  const response = await fetch('https://api.hive.blog', {
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
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(`API error: ${result.error.message}`);
  }
  
  return result.result;
}

// Types matching the original account.ts interface
export interface UserAccountData {
  username: string;
  reputation: number;
  reputationFormatted: string;
  // Liquid balances
  liquidHiveBalance: number;
  liquidHbdBalance: number;
  // Savings balances
  savingsHiveBalance: number;
  savingsHbdBalance: number;
  // Combined balances (for backward compatibility)
  hiveBalance: number;
  hbdBalance: number;
  hivePower: number;
  resourceCredits: number;
  resourceCreditsFormatted: string;
  hasEnoughRC: boolean;
  // Savings data
  savingsApr?: number;
  pendingWithdrawals?: Array<{
    id: string;
    amount: string;
    to: string;
    memo: string;
    requestId: number;
    from: string;
    timestamp: string;
  }>;
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

// Utility functions (simplified versions for WorkerBee implementation)
function calculateReputation(reputation: string | number): number {
  if (typeof reputation === 'string') {
    reputation = parseInt(reputation);
  }
  if (reputation === 0) return 25;
  const neg = reputation < 0;
  if (neg) reputation = -reputation;
  let rep = Math.log10(reputation);
  rep = Math.max(rep - 9, 0);
  if (rep < 0) rep = 0;
  rep = rep * 9 + 25;
  return neg ? -rep : rep;
}

function formatReputation(reputation: number): string {
  if (reputation < 0) return `${reputation.toFixed(2)}`;
  return `${reputation.toFixed(2)}`;
}

function parseAsset(assetString: string): { amount: number; symbol: string } {
  const [amount, symbol] = assetString.split(' ');
  return {
    amount: parseFloat(amount),
    symbol: symbol
  };
}

function vestingSharesToHive(vestingShares: string, totalVestingShares: string, totalVestingFundHive: string): number {
  const vestingSharesFloat = parseFloat(vestingShares);
  const totalVestingSharesFloat = parseFloat(totalVestingShares);
  const totalVestingFundHiveFloat = parseFloat(totalVestingFundHive);
  
  return (vestingSharesFloat / totalVestingSharesFloat) * totalVestingFundHiveFloat;
}

function parseJsonMetadata(jsonMetadata: string): any {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Fetch complete user account data using WorkerBee
 * @param username - Hive username
 * @returns Complete user account data
 */
export async function fetchUserAccount(username: string): Promise<UserAccountData | null> {
  try {
    console.log(`[WorkerBee fetchUserAccount] Starting fetch for username: ${username}`);
    
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();
    
    // Get account info using direct HTTP calls (WorkerBee's Wax API is complex, so we use direct calls)
    console.log(`[WorkerBee fetchUserAccount] Fetching account info...`);
    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
    
    if (!account || account.length === 0) {
      throw new Error(`Account ${username} not found`);
    }

    const accountData = account[0];
    console.log(`[WorkerBee fetchUserAccount] Account info received:`, accountData);

    // Get resource credits
    let rc = null;
    try {
      console.log(`[WorkerBee fetchUserAccount] Fetching resource credits...`);
      rc = await makeHiveApiCall('rc_api', 'get_resource_credits', [username]);
      console.log(`[WorkerBee fetchUserAccount] Resource credits received:`, rc);
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get resource credits:`, error);
    }

    // Get follow stats
    let followStats = null;
    try {
      console.log(`[WorkerBee fetchUserAccount] Fetching follow stats...`);
      const followResult = await makeHiveApiCall('condenser_api', 'get_follow_count', [username]);
      followStats = {
        followers: followResult.follower_count || 0,
        following: followResult.following_count || 0
      };
      console.log(`[WorkerBee fetchUserAccount] Follow stats received:`, followStats);
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get follow stats:`, error);
    }

    // Get HBD savings APR
    let savingsApr = 0;
    try {
      console.log(`[WorkerBee fetchUserAccount] Fetching HBD savings APR...`);
      const globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties');
      savingsApr = (globalProps.hbd_interest_rate || 0) / 100;
      console.log(`[WorkerBee fetchUserAccount] HBD savings APR received:`, savingsApr);
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get HBD savings APR:`, error);
    }

    // Parse balances
    const hiveAsset = parseAsset(accountData.balance);
    const hbdAsset = parseAsset(accountData.sbd_balance);
    const savingsHiveAsset = parseAsset(accountData.savings_balance);
    const savingsHbdAsset = parseAsset(accountData.savings_sbd_balance);

    // Parse profile metadata
    console.log(`[WorkerBee fetchUserAccount] Raw json_metadata:`, accountData.json_metadata);
    const profileMetadata = parseJsonMetadata(accountData.json_metadata);
    console.log(`[WorkerBee fetchUserAccount] Parsed profile metadata:`, profileMetadata);
    const profile = profileMetadata.profile || {};
    console.log(`[WorkerBee fetchUserAccount] Profile data:`, profile);

    // Get global properties for HIVE POWER calculation
    let globalProps = null;
    try {
      globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties');
    } catch (error) {
      console.warn('Failed to get global properties for HIVE POWER calculation');
    }

    // Calculate HIVE POWER from vesting shares
    let hivePower = 0;
    if (accountData.vesting_shares && globalProps) {
      hivePower = vestingSharesToHive(
        accountData.vesting_shares,
        globalProps.total_vesting_shares || '0',
        globalProps.total_vesting_fund_hive || '0'
      );
    }

    // Calculate Resource Credits percentage
    const rcPercentage = rc ? (parseFloat(rc.rc_manabar.current_mana) / parseFloat(rc.max_rc)) * 100 : 0;
    const reputation = calculateReputation(accountData.reputation);

    return {
      username: accountData.name,
      reputation,
      reputationFormatted: formatReputation(reputation),
      // Liquid balances
      liquidHiveBalance: hiveAsset.amount,
      liquidHbdBalance: hbdAsset.amount,
      // Savings balances
      savingsHiveBalance: savingsHiveAsset.amount,
      savingsHbdBalance: savingsHbdAsset.amount,
      // Combined balances (for backward compatibility)
      hiveBalance: hiveAsset.amount + savingsHiveAsset.amount,
      hbdBalance: hbdAsset.amount + savingsHbdAsset.amount,
      hivePower,
      resourceCredits: rcPercentage,
      resourceCreditsFormatted: rc ? `${rcPercentage.toFixed(1)}%` : '0%',
      hasEnoughRC: rc ? rcPercentage > 10 : false,
      // Savings data
      savingsApr,
      pendingWithdrawals: [], // TODO: Implement pending withdrawals with WorkerBee
      profile: {
        name: profile.name,
        about: profile.about,
        location: profile.location,
        website: profile.website,
        coverImage: profile.cover_image,
        profileImage: profile.profile_image,
      },
      stats: {
        postCount: accountData.post_count || 0,
        commentCount: accountData.comment_count || 0,
        voteCount: accountData.lifetime_vote_count || 0,
        followers: followStats?.followers || 0,
        following: followStats?.following || 0,
      },
      createdAt: new Date(accountData.created),
      lastPost: accountData.last_post ? new Date(accountData.last_post) : undefined,
      lastVote: accountData.last_vote_time ? new Date(accountData.last_vote_time) : undefined,
      canVote: accountData.can_vote || false,
      votingPower: accountData.voting_power || 0,
    };
  } catch (error) {
    console.error('Error fetching user account with WorkerBee:', error);
    throw error;
  }
}

/**
 * Fetch user balances only (lightweight) using WorkerBee
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
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    // Get account and RC data in parallel
    const [account, rc] = await Promise.all([
      makeHiveApiCall('condenser_api', 'get_accounts', [[username]]),
      makeHiveApiCall('rc_api', 'get_resource_credits', [username]).catch(() => null)
    ]);

    if (!account || account.length === 0) return null;

    const accountData = account[0];
    const hiveAsset = parseAsset(accountData.balance);
    const hbdAsset = parseAsset(accountData.sbd_balance);
    const savingsHiveAsset = parseAsset(accountData.savings_balance);
    const savingsHbdAsset = parseAsset(accountData.savings_sbd_balance);

    let hivePower = 0;
    if (accountData.vesting_shares) {
      const globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties');
      hivePower = vestingSharesToHive(
        accountData.vesting_shares,
        globalProps.total_vesting_shares,
        globalProps.total_vesting_fund_hive
      );
    }

    const rcPercentage = rc ? (parseFloat(rc.rc_manabar.current_mana) / parseFloat(rc.max_rc)) * 100 : 0;

    return {
      hiveBalance: hiveAsset.amount + savingsHiveAsset.amount,
      hbdBalance: hbdAsset.amount + savingsHbdAsset.amount,
      hivePower,
      resourceCredits: rcPercentage,
    };
  } catch (error) {
    console.error('Error fetching user balances with WorkerBee:', error);
    return null;
  }
}

/**
 * Fetch user profile metadata only using WorkerBee
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
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
    if (!account || account.length === 0) return null;

    const accountData = account[0];
    const profileMetadata = parseJsonMetadata(accountData.json_metadata);
    return profileMetadata.profile || {};
  } catch (error) {
    console.error('Error fetching user profile with WorkerBee:', error);
    return null;
  }
}

/**
 * Check if user exists on Hive blockchain using WorkerBee
 * @param username - Username to check
 * @returns True if user exists
 */
export async function userExists(username: string): Promise<boolean> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
    return account && account.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get user's followers and following counts using WorkerBee
 * @param username - Hive username
 * @returns Followers and following counts
 */
export async function getUserFollowStats(username: string): Promise<{
  followers: number;
  following: number;
} | null> {
  try {
    console.log(`[WorkerBee getUserFollowStats] Fetching follow stats for: ${username}`);
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const result = await makeHiveApiCall('condenser_api', 'get_follow_count', [username]);
    console.log(`[WorkerBee getUserFollowStats] Raw follow stats result:`, result);

    const followers = result.follower_count || 0;
    const following = result.following_count || 0;

    console.log(`[WorkerBee getUserFollowStats] Follow stats: ${followers} followers, ${following} following`);
    
    return {
      followers,
      following
    };
  } catch (error) {
    console.error('Error fetching follow stats with WorkerBee:', error);
    return null;
  }
}

/**
 * Fetch HBD savings APR from global properties using WorkerBee
 * @returns HBD savings interest rate as percentage
 */
export async function getHbdSavingsApr(): Promise<number> {
  try {
    console.log(`[WorkerBee getHbdSavingsApr] Fetching HBD savings APR...`);
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties');
    const apr = (globalProps.hbd_interest_rate || 0) / 100;
    console.log(`[WorkerBee getHbdSavingsApr] HBD savings APR: ${apr}%`);
    return apr;
  } catch (error) {
    console.error('Error fetching HBD savings APR with WorkerBee:', error);
    return 0;
  }
}

/**
 * Get user's delegation information using WorkerBee
 * @param username - Hive username
 * @returns Delegation info
 */
export async function getUserDelegations(username: string): Promise<{
  received: Array<{ delegator: string; vesting_shares: string; min_delegation_time: string }>;
  given: Array<{ delegatee: string; vesting_shares: string; min_delegation_time: string }>;
} | null> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    // Get received delegations
    const receivedDelegations = await makeHiveApiCall('condenser_api', 'get_vesting_delegations', [username, '', 100]);
    
    // Get given delegations (expiring delegations)
    const givenDelegations = await makeHiveApiCall('condenser_api', 'get_expiring_vesting_delegations', [username, new Date().toISOString(), 100]);

    return {
      received: receivedDelegations.map((d: any) => ({
        delegator: d.delegator,
        vesting_shares: String(d.vesting_shares),
        min_delegation_time: d.min_delegation_time
      })),
      given: givenDelegations.map((d: any) => ({
        delegatee: d.delegatee,
        vesting_shares: String(d.vesting_shares),
        min_delegation_time: d.min_delegation_time
      }))
    };
  } catch (error) {
    console.error('Error fetching delegations with WorkerBee:', error);
    return null;
  }
}

/**
 * Update user profile metadata using WorkerBee
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
  postingKey: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    // Get current account to preserve existing metadata
    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
    if (!account || account.length === 0) throw new Error('Account not found');

    const accountData = account[0];
    const currentMetadata = parseJsonMetadata(accountData.json_metadata);
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

    // Create account update operation using Wax
    const operation = {
      account: username,
      json_metadata: JSON.stringify(updatedMetadata),
      posting: accountData.posting,
      memo_key: accountData.memo_key,
      owner: accountData.owner,
      active: accountData.active,
    };

    // Broadcast transaction using WorkerBee
    const result = await client.broadcast(operation, postingKey);
    
    return { success: true, transactionId: result.id };
  } catch (error) {
    console.error('Error updating user profile with WorkerBee:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
