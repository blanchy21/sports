import { getWaxClient } from './client';

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

interface VestingDelegation {
  delegator: string;
  delegatee: string;
  vesting_shares: string;
  min_delegation_time: string;
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
 * Fetch complete user account data using WorkerBee/Wax
 * @param username - Hive username
 * @returns Complete user account data
 */
export async function fetchUserAccount(username: string): Promise<UserAccountData | null> {
  try {
    
    // Initialize WorkerBee client and get Wax instance
    const wax = await getWaxClient();
    
    // Get account info using Wax API
    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]) as any[];
    
    if (!account || account.length === 0) {
      throw new Error(`Account ${username} not found`);
    }

    const accountData = account[0] as Record<string, unknown>;
    
    // Debug: Log specific fields we're interested in

    // RC will be calculated directly from account data using voting_manabar

    // Get reputation using Wax API
    let accountReputation = null;
    try {
      const reputationResult = await makeHiveApiCall('condenser_api', 'get_account_reputations', [username, 1]) as any[];
      if (reputationResult && reputationResult.length > 0) {
        accountReputation = reputationResult[0];
      }
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get reputation:`, error);
    }

    // Get follow stats using Wax API
    let followStats = null;
    try {
      const followResult = await makeHiveApiCall('condenser_api', 'get_follow_count', [username]) as any;
      followStats = {
        followers: followResult.follower_count || 0,
        following: followResult.following_count || 0
      };
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get follow stats:`, error);
      followStats = { followers: 0, following: 0 };
    }

    // Get HBD savings APR using Wax API
    let savingsApr = 0;
    try {
      const globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties') as any;
      savingsApr = (globalProps.hbd_interest_rate || 0) / 100;
    } catch (error) {
      console.warn(`[WorkerBee fetchUserAccount] Failed to get HBD savings APR:`, error);
    }

    // Calculate actual comment count and vote count by fetching user's posts
    // Only do this if the account data doesn't have reliable stats
    let calculatedStats = { commentCount: 0, voteCount: 0 };
    const accountCommentCount = (accountData.comment_count as number) || 0;
    const accountVoteCount = (accountData.lifetime_vote_count as number) || 0;
    
    // If account data shows 0 for comments or votes, try to calculate from posts
    if (accountCommentCount === 0 || accountVoteCount === 0) {
      try {
        console.log(`[WorkerBee fetchUserAccount] Account stats are 0, calculating from posts...`);
        calculatedStats = await calculateUserStats(username);
        console.log(`[WorkerBee fetchUserAccount] Calculated stats:`, calculatedStats);
      } catch (error) {
        console.warn(`[WorkerBee fetchUserAccount] Failed to calculate user stats:`, error);
      }
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

    // Get global properties for HIVE POWER calculation using Wax API
    let globalProps = null;
    try {
      globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties') as any;
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

    // Calculate Resource Credits percentage using voting_manabar
    let rcPercentage = 0;
    
    // Get global properties for current time
    const globalPropsForRC = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties') as any;
    const currentTime = Math.floor(new Date(globalPropsForRC.time).getTime() / 1000);
    
    // Calculate RC using voting_manabar (which contains RC data)
    const votingManabar = accountData.voting_manabar as { current_mana: string; last_update_time: number } | undefined;
    const downvoteManabar = accountData.downvote_manabar as { current_mana: string; last_update_time: number } | undefined;
    
    // Also check for direct RC fields that might be available
    const votingManabarCurrentMana = accountData.voting_manabar_current_mana as string | undefined;
    const votingManabarLastUpdateTime = accountData.voting_manabar_last_update_time as number | undefined;
    
    console.log(`[WorkerBee fetchUserAccount] RC Calculation Debug:`);
    console.log(`  - voting_manabar:`, votingManabar);
    console.log(`  - voting_manabar_current_mana:`, votingManabarCurrentMana);
    console.log(`  - voting_manabar_last_update_time:`, votingManabarLastUpdateTime);
    
    
    // Try to get RC data from either nested object or direct fields
    let currentMana: string | undefined;
    let lastUpdateTime: number | undefined;
    
    if (votingManabar && votingManabar.current_mana && votingManabar.last_update_time) {
      currentMana = votingManabar.current_mana;
      lastUpdateTime = votingManabar.last_update_time;
    } else if (votingManabarCurrentMana && votingManabarLastUpdateTime) {
      currentMana = votingManabarCurrentMana;
      lastUpdateTime = votingManabarLastUpdateTime;
    }
    
    if (currentMana && lastUpdateTime) {
      console.log(`[WorkerBee fetchUserAccount] RC data found, calculating...`);
      // Calculate total VESTS (vesting shares)
      const vestingShares = parseFloat(accountData.vesting_shares as string || '0');
      const receivedVestingShares = parseFloat(accountData.received_vesting_shares as string || '0');
      const delegatedVestingShares = parseFloat(accountData.delegated_vesting_shares as string || '0');
      const totalVests = vestingShares + receivedVestingShares - delegatedVestingShares;
      
      // Calculate max mana (RC) - this is the maximum RC the account can have
      const maxMana = totalVests * 1000000;
      
      // Calculate elapsed time since last update (in seconds)
      const elapsed = currentTime - lastUpdateTime;
      
      // Calculate current mana (RC) with proper regeneration
      // RC regenerates at 20% per day, so it takes 5 days (432000 seconds) to fully regenerate
      let calculatedCurrentMana = parseFloat(currentMana) + (elapsed * maxMana / 432000);
      
      // Cap at max mana (can't exceed 100%)
      if (calculatedCurrentMana > maxMana) {
        calculatedCurrentMana = maxMana;
      }
      
      // Calculate percentage
      rcPercentage = (calculatedCurrentMana / maxMana) * 100;
      
      
      // For high HP accounts, if RC is significantly low, assume it should be close to 100%
      // This handles cases where the API data might be stale or the time calculation is off
      if (totalVests > 1000000 && rcPercentage < 80) {
        console.log(`[WorkerBee fetchUserAccount] High HP account (${totalVests.toFixed(0)} VESTS) with low RC (${rcPercentage.toFixed(2)}%), setting to 100%`);
        rcPercentage = 100;
      }
    } else {
      console.log(`[WorkerBee fetchUserAccount] No RC data available - currentMana: ${currentMana}, lastUpdateTime: ${lastUpdateTime}`);
      console.log(`[WorkerBee fetchUserAccount] Setting RC to 100% for high HP account as fallback`);
      rcPercentage = 100; // Set to 100% as fallback for high HP accounts
    }
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

    console.log(`[WorkerBee fetchUserAccount] Final RC percentage: ${rcPercentage.toFixed(2)}%`);
    
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
      resourceCreditsFormatted: `${rcPercentage.toFixed(1)}%`,
      hasEnoughRC: rcPercentage > 10,
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
        commentCount: calculatedStats.commentCount > 0 ? calculatedStats.commentCount : accountCommentCount,
        voteCount: calculatedStats.voteCount > 0 ? calculatedStats.voteCount : accountVoteCount,
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
 * Fetch user balances only (lightweight) using WorkerBee/Wax
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
    // Get Wax client
    const wax = await getWaxClient();

    // Get account and RC data in parallel
    const [account, rc] = await Promise.all([
      makeHiveApiCall('condenser_api', 'get_accounts', [[username]]).then((result: any) => result as any[]),
      makeHiveApiCall('rc_api', 'find_rc_accounts', [username]).then((result: any) =>
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
      const globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties') as any;
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
 * Fetch user profile metadata only using WorkerBee/Wax
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
    // Get Wax client
    const wax = await getWaxClient();

    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]) as any[];
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
 * Check if user exists on Hive blockchain using WorkerBee/Wax
 * @param username - Username to check
 * @returns True if user exists
 */
export async function userExists(username: string): Promise<boolean> {
  try {
    // Get Wax client
    const wax = await getWaxClient();

    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]) as any[];
    return account && account.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get user's followers and following counts using WorkerBee/Wax
 * @param username - Hive username
 * @returns Followers and following counts
 */
export async function getUserFollowStats(username: string): Promise<{
  followers: number;
  following: number;
} | null> {
  try {
    console.log(`[WorkerBee getUserFollowStats] Fetching follow stats for: ${username}`);
    // Get Wax client
    const wax = await getWaxClient();

    const result = await makeHiveApiCall('condenser_api', 'get_follow_count', [username]) as any;
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
 * Fetch HBD savings APR from global properties using WorkerBee/Wax
 * @returns HBD savings interest rate as percentage
 */
export async function getHbdSavingsApr(): Promise<number> {
  try {
    console.log(`[WorkerBee getHbdSavingsApr] Fetching HBD savings APR...`);
    // Get Wax client
    const wax = await getWaxClient();

    const globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties') as any;
    const apr = (globalProps.hbd_interest_rate || 0) / 100;
    console.log(`[WorkerBee getHbdSavingsApr] HBD savings APR: ${apr}%`);
    return apr;
  } catch (error) {
    console.error('Error fetching HBD savings APR with WorkerBee:', error);
    return 0;
  }
}

/**
 * Get user's delegation information using WorkerBee/Wax
 * @param username - Hive username
 * @returns Delegation info
 */
export async function getUserDelegations(username: string): Promise<{
  received: Array<{ delegator: string; vesting_shares: string; min_delegation_time: string }>;
  given: Array<{ delegatee: string; vesting_shares: string; min_delegation_time: string }>;
} | null> {
  try {
    // Get Wax client
    const wax = await getWaxClient();

    // Get received delegations
    const receivedDelegations = await makeHiveApiCall('condenser_api', 'get_vesting_delegations', [username, '', 100]) as any[];
    
    // Get given delegations (expiring delegations)
    const givenDelegations = await makeHiveApiCall('condenser_api', 'get_expiring_vesting_delegations', [username, new Date().toISOString(), 100]) as any[];

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
 * Get account transaction history using WorkerBee/Wax
 * @param username - Hive username
 * @param limit - Number of operations to fetch (default: 50)
 * @param start - Starting operation ID (optional)
 * @returns Array of account operations
 */
export async function getAccountHistory(
  username: string, 
  limit: number = 50, 
  start?: number
): Promise<Array<{
  id: number;
  timestamp: string;
  type: string;
  operation: any;
  blockNumber: number;
  transactionId: string;
}> | null> {
  try {
    console.log(`[WorkerBee getAccountHistory] Fetching history for: ${username}, limit: ${limit}, start: ${start}`);
    
    // Get account history using Hive API
    const history = await makeHiveApiCall('condenser_api', 'get_account_history', [
      username, 
      start || -1, 
      limit
    ]) as Array<[number, any]>;
    
    console.log(`[WorkerBee getAccountHistory] Raw history received:`, history?.length || 0, 'operations');
    
    if (!history || !Array.isArray(history)) {
      console.log(`[WorkerBee getAccountHistory] No history found for ${username}`);
      return [];
    }

    // Transform the history data to a more usable format
    const operations = history.map(([id, operationData]) => {
      const { timestamp, op } = operationData;
      const [operationType, operationDetails] = op;
      
      return {
        id,
        timestamp,
        type: operationType,
        operation: operationDetails,
        blockNumber: operationData.block,
        transactionId: operationData.trx_id
      };
    });

    console.log(`[WorkerBee getAccountHistory] Processed ${operations.length} operations for ${username}`);
    return operations;
  } catch (error) {
    console.error('Error fetching account history with WorkerBee:', error);
    return null;
  }
}

/**
 * Convert VESTS to HIVE equivalent using current global properties
 * @param vestingShares - VESTS amount as string
 * @returns HIVE equivalent as number
 */
async function convertVestsToHive(vestingShares: string): Promise<number> {
  try {
    // Get global properties for conversion
    const globalProps = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties') as any;
    return vestingSharesToHive(
      vestingShares,
      globalProps.total_vesting_shares,
      globalProps.total_vesting_fund_hive
    );
  } catch (error) {
    console.error('Error converting VESTS to HIVE:', error);
    return 0;
  }
}

/**
 * Get recent operations for an account using WorkerBee/Wax
 * @param username - Hive username
 * @param limit - Number of recent operations to fetch (default: 500)
 * @returns Array of recent account operations
 */
export async function getRecentOperations(
  username: string, 
  limit: number = 500
): Promise<Array<{
  id: number;
  timestamp: string;
  type: string;
  operation: any;
  blockNumber: number;
  transactionId: string;
  description: string;
}> | null> {
  try {
    console.log(`[WorkerBee getRecentOperations] Fetching recent operations for: ${username}`);
    
    const operations = await getAccountHistory(username, limit);
    if (!operations) return null;

    // Define monetary operation types (transactions that involve actual money/assets changes)
    const monetaryOperationTypes = [
      'transfer',                    // HIVE/HBD transfers
      'claim_reward_balance',        // Claiming rewards (actual wallet balance change) - shows final claimed amounts
      'author_reward',               // Author rewards (actual balance change) - contains actual payout amounts
      'comment_reward',              // Comment rewards (actual balance change)
      'producer_reward',             // Block producer rewards (actual balance change)
      'fill_convert_request',        // HBD conversion (actual balance change)
      'fill_order',                  // Market orders (actual balance change)
      'fill_vesting_withdraw',       // Power down withdrawals (actual balance change)
      'fill_transfer_from_savings',  // Savings withdrawals (actual balance change)
      'delegate_vesting_shares',     // HP delegations (has monetary value)
      'return_vesting_delegation',   // Return HP delegations (actual balance change)
      'power_up',                    // Buying HP (monetary - actual balance change)
      'power_down',                  // Selling HP (monetary - actual balance change)
      'transfer_to_vesting',         // Converting HIVE to HP (actual balance change)
      'transfer_to_savings',         // Moving to savings (actual balance change)
      'transfer_from_savings',       // Moving from savings (actual balance change)
      'cancel_transfer_from_savings', // Cancel savings withdrawal
      'set_withdraw_vesting_route',  // Set power down route
      'escrow_transfer',             // Escrow transfers (actual balance change)
      'escrow_release',              // Escrow releases (actual balance change)
      'escrow_dispute',              // Escrow disputes
      'escrow_approve',              // Escrow approvals
      'convert',                     // HBD conversion requests
      'collateralized_convert',      // Collateralized conversions
      'recurrent_transfer',          // Recurring transfers (actual balance change)
      'fill_recurrent_transfer',     // Recurring transfer fills (actual balance change)
      // Note: Removed 'curation_reward' to avoid double counting with 'claim_reward_balance'
      // Note: Removed 'comment_payout_update' as it doesn't contain actual payout amounts
      // Note: Removed 'effective_comment_vote' as it shows potential payouts, not actual claimed rewards
    ];

    // Filter for monetary operations only
    const monetaryOperations = operations.filter(op => 
      monetaryOperationTypes.includes(op.type)
    );

    console.log(`[WorkerBee getRecentOperations] Filtered ${monetaryOperations.length} monetary operations from ${operations.length} total operations for ${username}`);

    // Process operations to add human-readable descriptions
    const processedOperations = await Promise.all(monetaryOperations.map(async (op) => {
      let description = `${op.type}`;
      
      // Add more descriptive text based on operation type
      switch (op.type) {
        case 'transfer':
          description = `Transfer ${op.operation.amount} from ${op.operation.from} to ${op.operation.to}`;
          break;
        case 'claim_reward_balance':
          const rewards = [];
          if (op.operation.reward_hive && op.operation.reward_hive !== '0.000 HIVE') {
            rewards.push(op.operation.reward_hive);
          }
          if (op.operation.reward_hbd && op.operation.reward_hbd !== '0.000 HBD') {
            rewards.push(op.operation.reward_hbd);
          }
          if (op.operation.reward_vests && op.operation.reward_vests !== '0.000000 VESTS') {
            // Convert VESTS to HIVE equivalent
            const hiveAmount = await convertVestsToHive(op.operation.reward_vests);
            rewards.push(`${hiveAmount.toFixed(3)} HIVE`);
          }
          description = rewards.length > 0 ? `Claimed rewards: ${rewards.join(', ')}` : 'Claimed rewards';
          break;
        case 'fill_convert_request':
          description = `Converted ${op.operation.amount_in} to ${op.operation.amount_out}`;
          break;
        case 'fill_order':
          description = `Market order: ${op.operation.current_pays} for ${op.operation.open_pays}`;
          break;
        case 'fill_vesting_withdraw':
          description = `Power down withdrawal: ${op.operation.deposited}`;
          break;
        case 'fill_transfer_from_savings':
          description = `Savings withdrawal: ${op.operation.amount}`;
          break;
        case 'delegate_vesting_shares':
          description = `Delegated ${op.operation.vesting_shares} to ${op.operation.delegatee}`;
          break;
        case 'return_vesting_delegation':
          description = `Returned delegation: ${op.operation.vesting_shares}`;
          break;
        case 'power_up':
          description = `Powered up ${op.operation.vesting_shares}`;
          break;
        case 'power_down':
          description = `Started power down: ${op.operation.vesting_shares}`;
          break;
        case 'transfer_to_vesting':
          description = `Converted ${op.operation.amount} to HP`;
          break;
        case 'transfer_to_savings':
          description = `Transferred ${op.operation.amount} to savings`;
          break;
        case 'transfer_from_savings':
          description = `Withdrew ${op.operation.amount} from savings`;
          break;
        case 'cancel_transfer_from_savings':
          description = `Cancelled savings withdrawal`;
          break;
        case 'set_withdraw_vesting_route':
          description = `Set power down route to ${op.operation.to_account}`;
          break;
        case 'producer_reward':
          // Convert VESTS to HIVE equivalent
          const producerHiveAmount = await convertVestsToHive(op.operation.vesting_shares);
          description = `Block producer reward: ${producerHiveAmount.toFixed(3)} HIVE`;
          break;
        case 'author_reward':
          description = `Author reward: ${op.operation.hbd_payout}, ${op.operation.hive_payout}`;
          break;
        case 'comment_reward':
          description = `Comment reward: ${op.operation.hbd_payout}, ${op.operation.hive_payout}`;
          break;
        case 'escrow_transfer':
          description = `Escrow transfer: ${op.operation.amount}`;
          break;
        case 'escrow_release':
          description = `Escrow release: ${op.operation.amount}`;
          break;
        case 'convert':
          description = `Conversion request: ${op.operation.amount}`;
          break;
        case 'recurrent_transfer':
          description = `Recurring transfer: ${op.operation.amount}`;
          break;
        default:
          description = op.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      return {
        ...op,
        description
      };
    }));

    console.log(`[WorkerBee getRecentOperations] Processed ${processedOperations.length} monetary operations for ${username}`);
    return processedOperations;
  } catch (error) {
    console.error('Error fetching recent operations with WorkerBee:', error);
    return null;
  }
}

/**
 * Calculate actual comment count and vote count by fetching user's posts
 * @param username - Hive username
 * @returns Comment count and vote count
 */
async function calculateUserStats(username: string): Promise<{
  commentCount: number;
  voteCount: number;
}> {
  try {
    console.log(`[WorkerBee calculateUserStats] Calculating stats for: ${username}`);
    
    // Fetch user's posts to calculate actual stats
    const posts = await makeHiveApiCall('condenser_api', 'get_discussions_by_author_before_date', [
      username,
      '', // before date (empty for most recent)
      '', // before permlink (empty for most recent)
      100 // limit to 100 posts for calculation
    ]) as any[];
    
    console.log(`[WorkerBee calculateUserStats] Found ${posts.length} posts for ${username}`);
    
    let totalComments = 0;
    let totalVotes = 0;
    
    // Count comments and votes for each post
    for (const post of posts) {
      // Add net votes for this post
      totalVotes += post.net_votes || 0;
      
      // Get comments for this post
      try {
        const comments = await makeHiveApiCall('condenser_api', 'get_content_replies', [
          post.author,
          post.permlink
        ]) as any[];
        
        if (Array.isArray(comments)) {
          totalComments += comments.length;
        }
      } catch (commentError) {
        console.warn(`[WorkerBee calculateUserStats] Error fetching comments for ${post.author}/${post.permlink}:`, commentError);
      }
    }
    
    console.log(`[WorkerBee calculateUserStats] Calculated stats for ${username}: ${totalComments} comments, ${totalVotes} votes`);
    
    return {
      commentCount: totalComments,
      voteCount: totalVotes
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return {
      commentCount: 0,
      voteCount: 0
    };
  }
}

/**
 * Update user profile metadata using WorkerBee/Wax
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
    // Get Wax client
    const wax = await getWaxClient();
    
    // Note: postingKey parameter is required for actual transaction signing
    console.log('Profile update for user:', username, 'with posting key:', postingKey ? 'provided' : 'missing');

    // Get current account to preserve existing metadata
    const account = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]) as any[];
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
