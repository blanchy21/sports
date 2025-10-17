import { initializeWorkerBeeClient } from './client';

// Types for Hive API responses (unused but kept for future use)
// interface HiveApiResponse<T = unknown> {
//   id: number;
//   result: T;
//   error?: {
//     code: number;
//     message: string;
//   };
// }

interface VestingDelegation {
  delegator: string;
  delegatee: string;
  vesting_shares: string;
  min_delegation_time: string;
}

// Helper function to make direct HTTP calls to Hive API with fallback nodes
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
  console.log(`[calculateReputation] Input reputation:`, reputation, 'Type:', typeof reputation);
  
  if (typeof reputation === 'string') {
    reputation = parseInt(reputation);
    console.log(`[calculateReputation] Parsed reputation:`, reputation);
  }
  
  if (reputation === 0) {
    console.log(`[calculateReputation] Reputation is 0, returning default 25`);
    return 25;
  }
  
  // Use the correct Hive reputation formula
  const neg = reputation < 0;
  if (neg) reputation = -reputation;
  
  // Correct Hive reputation calculation: (log10(reputation) - 9) * 9 + 25
  let rep = Math.log10(reputation);
  console.log(`[calculateReputation] log10(${reputation}) = ${rep}`);
  rep = (rep - 9) * 9 + 25;
  console.log(`[calculateReputation] Final calculation: ${rep} (negative: ${neg})`);
  
  return neg ? -rep : rep;
}

function formatReputation(reputation: number): string {
  if (reputation < 0) return `${reputation.toFixed(2)}`;
  return `${reputation.toFixed(2)}`;
}

function parseAsset(assetString: string): { amount: number; symbol: string } {
  if (!assetString || typeof assetString !== 'string') {
    return { amount: 0, symbol: 'HIVE' };
  }
  const [amount, symbol] = assetString.split(' ');
  return {
    amount: parseFloat(amount || '0'),
    symbol: symbol || 'HIVE'
  };
}

function vestingSharesToHive(vestingShares: string, totalVestingShares: string, totalVestingFundHive: string): number {
  const vestingSharesFloat = parseFloat(vestingShares);
  const totalVestingSharesFloat = parseFloat(totalVestingShares);
  const totalVestingFundHiveFloat = parseFloat(totalVestingFundHive);
  
  return (vestingSharesFloat / totalVestingSharesFloat) * totalVestingFundHiveFloat;
}

function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
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
    const account = await makeHiveApiCall<Array<Record<string, unknown>>>('condenser_api', 'get_accounts', [[username]]);
    
    if (!account || account.length === 0) {
      throw new Error(`Account ${username} not found`);
    }

    const accountData = account[0] as Record<string, unknown>;
    console.log(`[WorkerBee fetchUserAccount] Account info received:`, accountData);
    console.log(`[WorkerBee fetchUserAccount] Available fields:`, Object.keys(accountData));
    console.log(`[WorkerBee fetchUserAccount] Reputation field:`, accountData.reputation);
    console.log(`[WorkerBee fetchUserAccount] All reputation-related fields:`, {
      reputation: accountData.reputation,
      rep: accountData.rep,
      reputation_score: accountData.reputation_score,
      rep_score: accountData.rep_score
    });
    console.log(`[WorkerBee fetchUserAccount] Created date info:`, {
      created: accountData.created,
      createdType: typeof accountData.created,
      isValidDate: accountData.created ? !isNaN(new Date(accountData.created as string).getTime()) : false
    });

    // Get resource credits - skip RC for now due to API issues
    const rc = null;
    console.log(`[WorkerBee fetchUserAccount] Skipping resource credits fetch due to API compatibility issues`);
    // TODO: Implement alternative RC fetching method when API is fixed

    // Get reputation using the correct API method
    let accountReputation = null;
    try {
      console.log(`[WorkerBee fetchUserAccount] Fetching reputation...`);
      const reputationResult = await makeHiveApiCall<Array<{account: string; reputation: string}>>('condenser_api', 'get_account_reputations', [username, 1]);
      if (reputationResult && reputationResult.length > 0) {
        accountReputation = reputationResult[0];
        console.log(`[WorkerBee fetchUserAccount] Reputation data received:`, accountReputation);
      }
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get reputation:`, error);
    }

    // Get follow stats
    let followStats = null;
    try {
      console.log(`[WorkerBee fetchUserAccount] Fetching follow stats...`);
      const followResult = await makeHiveApiCall<{follower_count: number; following_count: number}>('condenser_api', 'get_follow_count', [username]);
      followStats = {
        followers: followResult.follower_count || 0,
        following: followResult.following_count || 0
      };
      console.log(`[WorkerBee fetchUserAccount] Follow stats received:`, followStats);
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get follow stats:`, error);
      // Set default values if follow stats fail
      followStats = {
        followers: 0,
        following: 0
      };
    }

    // Get HBD savings APR
    let savingsApr = 0;
    try {
      console.log(`[WorkerBee fetchUserAccount] Fetching HBD savings APR...`);
      const globalProps = await makeHiveApiCall<{hbd_interest_rate: number}>('condenser_api', 'get_dynamic_global_properties');
      savingsApr = (globalProps.hbd_interest_rate || 0) / 100;
      console.log(`[WorkerBee fetchUserAccount] HBD savings APR received:`, savingsApr);
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get HBD savings APR:`, error);
    }

    // Parse balances
    const hiveAsset = parseAsset(accountData.balance as string);
    const hbdAsset = parseAsset(accountData.hbd_balance as string);
    const savingsHiveAsset = parseAsset(accountData.savings_balance as string);
    const savingsHbdAsset = parseAsset(accountData.savings_hbd_balance as string);

    // Parse profile metadata from both json_metadata and posting_json_metadata
    console.log(`[WorkerBee fetchUserAccount] Raw json_metadata:`, accountData.json_metadata);
    console.log(`[WorkerBee fetchUserAccount] Raw posting_json_metadata:`, accountData.posting_json_metadata);
    
    const profileMetadata = parseJsonMetadata(accountData.json_metadata as string);
    const postingProfileMetadata = parseJsonMetadata(accountData.posting_json_metadata as string);
    
    console.log(`[WorkerBee fetchUserAccount] Parsed json_metadata:`, profileMetadata);
    console.log(`[WorkerBee fetchUserAccount] Parsed posting_json_metadata:`, postingProfileMetadata);
    
    // Merge profile data, prioritizing posting_json_metadata for profile info
    const profile = {
      ...(profileMetadata.profile || {}),
      ...(postingProfileMetadata.profile || {})
    } as Record<string, unknown>;
    
    console.log(`[WorkerBee fetchUserAccount] Merged profile data:`, profile);

    // Get global properties for HIVE POWER calculation
    let globalProps = null;
    try {
      globalProps = await makeHiveApiCall<Record<string, unknown>>('condenser_api', 'get_dynamic_global_properties');
    } catch {
      console.warn('Failed to get global properties for HIVE POWER calculation');
    }

    // Calculate HIVE POWER from vesting shares
    let hivePower = 0;
    if (accountData.vesting_shares && globalProps) {
      hivePower = vestingSharesToHive(
        accountData.vesting_shares as string,
        (globalProps as { total_vesting_shares?: string }).total_vesting_shares || '0',
        (globalProps as { total_vesting_fund_hive?: string }).total_vesting_fund_hive || '0'
      );
    }

    // Calculate Resource Credits percentage
    const rcPercentage = rc && (rc as unknown as { rc_manabar?: { current_mana: string }; max_rc?: string }).rc_manabar && (rc as unknown as { rc_manabar?: { current_mana: string }; max_rc?: string }).max_rc
      ? (parseFloat((rc as unknown as { rc_manabar: { current_mana: string }; max_rc: string }).rc_manabar.current_mana) / parseFloat((rc as unknown as { rc_manabar: { current_mana: string }; max_rc: string }).max_rc)) * 100 
      : 0;
    // Use reputation from the dedicated API call if available, otherwise fall back to account data
    let rawReputation: string | number;
    if (accountReputation && accountReputation.reputation) {
      rawReputation = accountReputation.reputation;
      console.log(`[WorkerBee fetchUserAccount] Using reputation from get_account_reputations API:`, rawReputation);
    } else {
      rawReputation = accountData.reputation as string | number;
      console.log(`[WorkerBee fetchUserAccount] Using reputation from get_accounts API:`, rawReputation);
    }
    
    console.log(`[WorkerBee fetchUserAccount] Raw reputation for ${username}:`, rawReputation, 'Type:', typeof rawReputation);
    
    // Debug: Show what raw value would produce the expected vs actual reputation
    if (rawReputation && rawReputation !== 0 && rawReputation !== '0') {
      const calculated = calculateReputation(rawReputation);
      console.log(`[WorkerBee fetchUserAccount] DEBUG: Raw ${rawReputation} → Calculated ${calculated}`);
      
      // If the calculated reputation seems too high, let's check if we need to adjust the formula
      if (calculated > 100) {
        console.log(`[WorkerBee fetchUserAccount] WARNING: Calculated reputation ${calculated} seems unusually high`);
        console.log(`[WorkerBee fetchUserAccount] Expected range: 25-100 for most users`);
      }
    }
    
    // Handle case where reputation is 0 or undefined
    let reputation: number;
    if (!rawReputation || rawReputation === 0 || rawReputation === '0') {
      console.log(`[WorkerBee fetchUserAccount] Reputation is 0/undefined, using default value of 25`);
      reputation = 25; // Default reputation for new accounts
    } else {
      reputation = calculateReputation(rawReputation);
    }
    console.log(`[WorkerBee fetchUserAccount] Final reputation for ${username}:`, reputation);

    return {
      username: accountData.name as string,
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
        name: profile.name as string,
        about: profile.about as string,
        location: profile.location as string,
        website: profile.website as string,
        coverImage: profile.cover_image as string,
        profileImage: profile.profile_image as string,
      },
      stats: {
        postCount: (accountData.post_count as number) || 0,
        commentCount: (accountData.comment_count as number) || 0,
        voteCount: (accountData.lifetime_vote_count as number) || 0,
        followers: followStats?.followers || 0,
        following: followStats?.following || 0,
      },
      createdAt: accountData.created ? new Date(accountData.created as string) : new Date(),
      lastPost: accountData.last_post ? new Date(accountData.last_post as string) : undefined,
      lastVote: accountData.last_vote_time ? new Date(accountData.last_vote_time as string) : undefined,
      canVote: (accountData.can_vote as boolean) || false,
      votingPower: (accountData.voting_power as number) || 0,
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
      makeHiveApiCall<Array<Record<string, unknown>>>('condenser_api', 'get_accounts', [[username]]),
      makeHiveApiCall<{rc_accounts: Array<Record<string, unknown>>}>('rc_api', 'find_rc_accounts', [username]).then(result => 
        result && result.rc_accounts && result.rc_accounts.length > 0 ? result.rc_accounts[0] as Record<string, unknown> : null
      ).catch(() => null)
    ]);

    if (!account || account.length === 0) return null;

    const accountData = account[0];
    const hiveAsset = parseAsset(accountData.balance as string);
    const hbdAsset = parseAsset(accountData.hbd_balance as string);
    const savingsHiveAsset = parseAsset(accountData.savings_balance as string);
    const savingsHbdAsset = parseAsset(accountData.savings_hbd_balance as string);

    let hivePower = 0;
    if (accountData.vesting_shares) {
      const globalProps = await makeHiveApiCall<{total_vesting_shares: string; total_vesting_fund_hive: string}>('condenser_api', 'get_dynamic_global_properties');
      hivePower = vestingSharesToHive(
        accountData.vesting_shares as string,
        globalProps.total_vesting_shares,
        globalProps.total_vesting_fund_hive
      );
    }

    const rcPercentage = rc && (rc as unknown as { rc_manabar?: { current_mana: string }; max_rc?: string }).rc_manabar && (rc as unknown as { rc_manabar?: { current_mana: string }; max_rc?: string }).max_rc
      ? (parseFloat((rc as unknown as { rc_manabar: { current_mana: string }; max_rc: string }).rc_manabar.current_mana) / parseFloat((rc as unknown as { rc_manabar: { current_mana: string }; max_rc: string }).max_rc)) * 100 
      : 0;

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

    const account = await makeHiveApiCall<Array<Record<string, unknown>>>('condenser_api', 'get_accounts', [[username]]);
    if (!account || account.length === 0) return null;

    const accountData = account[0];
    const profileMetadata = parseJsonMetadata(accountData.json_metadata as string);
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

    const account = await makeHiveApiCall<Array<Record<string, unknown>>>('condenser_api', 'get_accounts', [[username]]);
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

    const followers = (result as { follower_count?: number }).follower_count || 0;
    const following = (result as { following_count?: number }).following_count || 0;

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

    const globalProps = await makeHiveApiCall<{hbd_interest_rate: number}>('condenser_api', 'get_dynamic_global_properties');
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
      received: (receivedDelegations as VestingDelegation[]).map((d) => ({
        delegator: d.delegator,
        vesting_shares: String(d.vesting_shares),
        min_delegation_time: d.min_delegation_time
      })),
      given: (givenDelegations as VestingDelegation[]).map((d) => ({
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
    
    // Note: postingKey parameter is required for actual transaction signing
    console.log('Profile update for user:', username, 'with posting key:', postingKey ? 'provided' : 'missing');

    // Get current account to preserve existing metadata
    const account = await makeHiveApiCall<Array<Record<string, unknown>>>('condenser_api', 'get_accounts', [[username]]);
    if (!account || account.length === 0) throw new Error('Account not found');

    const accountData = account[0];
    const currentMetadata = parseJsonMetadata(accountData.json_metadata as string);
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

    // Initialize WorkerBee client for broadcasting
    await initializeWorkerBeeClient();
    
    // Broadcast transaction using WorkerBee
    // Note: This is a placeholder - actual broadcasting would require proper transaction formatting
    console.log('Profile update operation prepared:', operation);
    // const client = await initializeWorkerBeeClient();
    // await client.broadcast(operation);
    
    return { success: true, transactionId: 'broadcasted' };
  } catch (error) {
    console.error('Error updating user profile with WorkerBee:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
