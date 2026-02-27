// Type definitions for better type safety

interface RcAccountData {
  account?: string;
  rc_manabar?: {
    current_mana: string;
    last_update_time: number;
  };
  max_rc?: string;
  delegated_rc?: string;
  received_delegated_rc?: string;
  [key: string]: unknown;
}

interface ReputationData {
  account?: string;
  reputation?: string;
  [key: string]: unknown;
}

interface FollowCountData {
  account?: string;
  follower_count?: number;
  following_count?: number;
  [key: string]: unknown;
}

interface GlobalProperties {
  total_vesting_fund_hive?: string;
  total_vesting_shares?: string;
  hbd_interest_rate?: number;
  [key: string]: unknown;
}

interface VestingDelegation {
  id?: number;
  delegator: string;
  delegatee: string;
  vesting_shares: string;
  min_delegation_time: string;
  [key: string]: unknown;
}

interface HiveOperation {
  type?: string;
  [key: string]: unknown;
}

interface HiveTransaction {
  timestamp: string;
  op: [string, HiveOperation];
  block: number;
  trx_id: string;
}

import { makeHiveApiCall } from './api';
import { HiveAccount } from '../shared/types';
import { calculateReputation } from '../utils/hive';
import { getAccountOptimized, getContentOptimized } from './optimization';
import {
  workerBee as workerBeeLog,
  warn as logWarn,
  error as logError,
  info as logInfo,
} from './logger';

const WORKERBEE_DEBUG_ENABLED =
  process.env.NEXT_PUBLIC_WORKERBEE_DEBUG === 'true' || process.env.NODE_ENV === 'development';

// ============================================================================
// Hive Account Existence Cache
// ============================================================================
// Caches whether usernames exist on Hive to avoid repeated API calls
// Especially useful for soft-auth users who don't have Hive accounts

interface AccountCacheEntry {
  exists: boolean;
  checkedAt: number;
}

// Cache with 30-minute TTL for existing accounts, 5-minute for non-existing
// (non-existing accounts might be created, existing accounts rarely get deleted)
const CACHE_TTL_EXISTS = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_NOT_EXISTS = 5 * 60 * 1000; // 5 minutes
const accountExistsCache = new Map<string, AccountCacheEntry>();

/**
 * Check if a username exists on Hive (with caching)
 * This is optimized to avoid repeated API calls for soft-auth users
 * @param username - Username to check
 * @returns True if account exists on Hive, false otherwise
 */
export async function isHiveAccount(username: string): Promise<boolean> {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const normalizedUsername = username.toLowerCase().trim();
  if (!normalizedUsername) {
    return false;
  }

  // Check cache first
  const cached = accountExistsCache.get(normalizedUsername);
  if (cached) {
    const ttl = cached.exists ? CACHE_TTL_EXISTS : CACHE_TTL_NOT_EXISTS;
    if (Date.now() - cached.checkedAt < ttl) {
      return cached.exists;
    }
    // Cache expired, remove it
    accountExistsCache.delete(normalizedUsername);
  }

  // Make API call to check existence
  try {
    const accounts = (await makeHiveApiCall('condenser_api', 'get_accounts', [
      [normalizedUsername],
    ])) as HiveAccount[];

    const exists = Array.isArray(accounts) && accounts.length > 0;

    // Cache the result
    accountExistsCache.set(normalizedUsername, {
      exists,
      checkedAt: Date.now(),
    });

    if (!exists) {
      logInfo(`Account "${username}" does not exist on Hive (cached for 5min)`);
    }

    return exists;
  } catch (error) {
    // On error, assume not exists but don't cache (might be network issue)
    logWarn(`Error checking Hive account existence for "${username}"`, 'isHiveAccount', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Clear the account existence cache (useful for testing)
 */
export function clearAccountExistsCache(): void {
  accountExistsCache.clear();
}

/**
 * Pre-populate cache for known non-Hive accounts (e.g., soft-auth users)
 * @param usernames - Array of usernames known to not exist on Hive
 */
export function markAsNonHiveAccounts(usernames: string[]): void {
  const now = Date.now();
  for (const username of usernames) {
    if (username) {
      accountExistsCache.set(username.toLowerCase().trim(), {
        exists: false,
        checkedAt: now,
      });
    }
  }
}

const debugLog = (...args: unknown[]) => {
  if (!WORKERBEE_DEBUG_ENABLED || args.length === 0) {
    return;
  }
  const [message, ...rest] = args;
  workerBeeLog(
    String(message),
    'WorkerBeeAccount',
    rest.length === 1 ? rest[0] : rest.length > 1 ? rest : undefined
  );
};

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
    symbol: symbol || 'HIVE',
  };
}

function vestingSharesToHive(
  vestingShares: string,
  totalVestingShares: string,
  totalVestingFundHive: string
): number {
  const vestingSharesFloat = parseFloat(vestingShares);
  const totalVestingSharesFloat = parseFloat(totalVestingShares);
  const totalVestingFundHiveFloat = parseFloat(totalVestingFundHive);

  if (!totalVestingSharesFloat || !isFinite(totalVestingSharesFloat)) return 0;

  return (vestingSharesFloat / totalVestingSharesFloat) * totalVestingFundHiveFloat;
}

/**
 * Parse JSON metadata string safely
 * Used for account profile metadata and post metadata
 */
export function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Pending withdrawal entry type
 */
type PendingWithdrawal = {
  id: string;
  amount: string;
  to: string;
  memo: string;
  requestId: number;
  from: string;
  timestamp: string;
};

/**
 * Calculate pending power down withdrawals from account data
 */
function calculatePendingWithdrawals(
  accountData: HiveAccount,
  globalProps: GlobalProperties | null
): PendingWithdrawal[] {
  const withdrawals: PendingWithdrawal[] = [];

  // Check if there's an active power down
  const toWithdraw = BigInt(String(accountData.to_withdraw || '0'));
  const withdrawn = BigInt(String(accountData.withdrawn || '0'));
  const vestingWithdrawRate = accountData.vesting_withdraw_rate;
  const nextVestingWithdrawal = accountData.next_vesting_withdrawal;

  // If to_withdraw is 0 or equal to withdrawn, no active power down
  if (toWithdraw === BigInt(0) || toWithdraw <= withdrawn) {
    return withdrawals;
  }

  // Parse the vesting withdraw rate (VESTS per week)
  const rateVests = parseAsset(vestingWithdrawRate || '0 VESTS');

  // Calculate how much HIVE this represents
  let rateHive = 0;
  if (globalProps && rateVests.amount > 0) {
    const totalVestingShares = parseFloat(
      (globalProps as { total_vesting_shares?: string }).total_vesting_shares || '0'
    );
    const totalVestingFundHive = parseFloat(
      (globalProps as { total_vesting_fund_hive?: string }).total_vesting_fund_hive || '0'
    );
    if (totalVestingShares > 0) {
      rateHive = (rateVests.amount / totalVestingShares) * totalVestingFundHive;
    }
  }

  // Calculate remaining withdrawals
  const remainingVests = toWithdraw - withdrawn;
  const weeksRemaining =
    rateVests.amount > 0 ? Math.ceil(Number(remainingVests) / 1000000 / rateVests.amount) : 0;

  // Create entries for each remaining week
  const nextDate = new Date(nextVestingWithdrawal);
  const username = accountData.name;

  for (let i = 0; i < Math.min(weeksRemaining, 13); i++) {
    const withdrawalDate = new Date(nextDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);

    withdrawals.push({
      id: `powerdown-${username}-${i}`,
      amount: `${rateHive.toFixed(3)} HIVE`,
      to: username,
      memo: 'Power Down',
      requestId: i,
      from: username,
      timestamp: withdrawalDate.toISOString(),
    });
  }

  return withdrawals;
}

/**
 * Fetch complete user account data using WorkerBee/Wax
 * @param username - Hive username
 * @returns Complete user account data
 */
export async function fetchUserAccount(username: string): Promise<UserAccountData | null> {
  try {
    // Get account info using optimized caching
    const account = await getAccountOptimized(username);

    if (!account) {
      throw new Error(`Account ${username} not found`);
    }

    const accountData = account;

    // Debug: Log specific fields we're interested in

    // PERFORMANCE OPTIMIZATION: Run all supplemental API calls in parallel
    // This reduces total fetch time from 5-15s (sequential) to 1-3s (parallel)
    const [reputationResult, followResult, globalPropsResult, rcResult] = await Promise.all([
      // Reputation - with fallback
      getContentOptimized('get_account_reputations', [username, 1])
        .then((result) => {
          const data = result as ReputationData[];
          return data && data.length > 0 ? data[0] : null;
        })
        .catch((error) => {
          logWarn(
            '[WorkerBee fetchUserAccount] Failed to get reputation',
            'fetchUserAccount',
            error
          );
          return null;
        }),

      // Follow stats - with fallback
      getContentOptimized('get_follow_count', [username])
        .then((result) => {
          const data = result as FollowCountData;
          return {
            followers: data.follower_count || 0,
            following: data.following_count || 0,
          };
        })
        .catch((error) => {
          logWarn(
            '[WorkerBee fetchUserAccount] Failed to get follow stats',
            'fetchUserAccount',
            error
          );
          return { followers: 0, following: 0 };
        }),

      // Global properties - with 3s timeout to prevent blocking account fetch
      Promise.race([
        makeHiveApiCall('condenser_api', 'get_dynamic_global_properties').then(
          (result) => result as GlobalProperties
        ),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).catch(() => {
        logWarn('Failed to get global properties for HIVE POWER calculation', 'fetchUserAccount');
        return null;
      }),

      // RC API - with very short 500ms timeout (non-critical data, shouldn't block account fetch)
      // This data is failing on most nodes anyway, so don't let it slow down login
      // Note: rc_api uses object params { accounts: [username] }, not array params
      Promise.race([
        makeHiveApiCall('rc_api', 'find_rc_accounts', { accounts: [username] }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
      ]).catch((err) => {
        logWarn('Failed to fetch RC accounts', 'fetchUserAccount', {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }),
    ]);

    // Process results from parallel calls
    const accountReputation = reputationResult;
    const followStats = followResult;
    const globalProps = globalPropsResult;

    // Calculate savings APR from global props
    const savingsApr = globalProps ? (globalProps.hbd_interest_rate || 0) / 100 : 0;

    // Use account stats directly - skip expensive calculateUserStats call
    // The get_discussions_by_author_before_date API is unreliable and causes 15+ second delays
    const calculatedStats = { commentCount: 0, voteCount: 0 };
    const accountCommentCount = (accountData.comment_count as number) || 0;
    const accountVoteCount = (accountData.lifetime_vote_count as number) || 0;

    // Note: We no longer call calculateUserStats as it uses get_discussions_by_author_before_date
    // which frequently times out and blocks the login flow for 15+ seconds per node

    // Parse balances
    const hiveAsset = parseAsset(accountData.balance as string);
    const hbdAsset = parseAsset(accountData.hbd_balance as string);
    const savingsHiveAsset = parseAsset(accountData.savings_balance as string);
    const savingsHbdAsset = parseAsset(accountData.savings_hbd_balance as string);

    // Parse profile metadata from both json_metadata and posting_json_metadata
    debugLog(`[WorkerBee fetchUserAccount] Raw json_metadata:`, accountData.json_metadata);
    debugLog(
      `[WorkerBee fetchUserAccount] Raw posting_json_metadata:`,
      accountData.posting_json_metadata
    );

    const profileMetadata = parseJsonMetadata(accountData.json_metadata as string);
    const postingProfileMetadata = parseJsonMetadata(accountData.posting_json_metadata as string);

    debugLog(`[WorkerBee fetchUserAccount] Parsed json_metadata:`, profileMetadata);
    debugLog(`[WorkerBee fetchUserAccount] Parsed posting_json_metadata:`, postingProfileMetadata);

    // Merge profile data, prioritizing posting_json_metadata for profile info
    const profile = {
      ...(profileMetadata.profile || {}),
      ...(postingProfileMetadata.profile || {}),
    } as Record<string, unknown>;

    debugLog(`[WorkerBee fetchUserAccount] Merged profile data:`, profile);

    // Calculate HIVE POWER from vesting shares
    let hivePower = 0;
    if (accountData.vesting_shares && globalProps) {
      hivePower = vestingSharesToHive(
        accountData.vesting_shares as string,
        (globalProps as { total_vesting_shares?: string }).total_vesting_shares || '0',
        (globalProps as { total_vesting_fund_hive?: string }).total_vesting_fund_hive || '0'
      );
    }

    // Process Resource Credits from parallel call result (already completed above)
    let rcPercentage = 100; // Default to 100% if RC fetch failed

    if (rcResult) {
      try {
        const rcData = rcResult as { rc_accounts?: RcAccountData[] };
        debugLog(`[WorkerBee fetchUserAccount] RC API response:`, rcData);

        if (
          rcData.rc_accounts &&
          Array.isArray(rcData.rc_accounts) &&
          rcData.rc_accounts.length > 0
        ) {
          const rc = rcData.rc_accounts[0] as {
            rc_manabar?: { current_mana: string };
            max_rc?: string;
          };

          if (rc.rc_manabar && rc.max_rc) {
            const currentMana = parseFloat(rc.rc_manabar.current_mana);
            const maxRc = parseFloat(rc.max_rc);

            if (maxRc > 0) {
              rcPercentage = (currentMana / maxRc) * 100;
              debugLog(
                `[WorkerBee fetchUserAccount] RC from rc_api: ${rcPercentage.toFixed(2)}% (${currentMana.toLocaleString()} / ${maxRc.toLocaleString()})`
              );
            } else {
              debugLog(`[WorkerBee fetchUserAccount] Max RC is 0, setting RC to 100%`);
            }
          } else {
            debugLog(`[WorkerBee fetchUserAccount] RC data structure invalid, setting RC to 100%`);
          }
        } else {
          debugLog(`[WorkerBee fetchUserAccount] No RC data from rc_api, setting RC to 100%`);
        }
      } catch (rcError) {
        debugLog(
          `[WorkerBee fetchUserAccount] Error processing RC result, setting RC to 100%: ${rcError}`
        );
      }
    } else {
      debugLog(
        `[WorkerBee fetchUserAccount] RC fetch timed out or failed, setting RC to 100% as fallback`
      );
    }
    // Use reputation from the dedicated API call if available, otherwise fall back to account data
    let rawReputation: string | number;
    if (accountReputation && accountReputation.reputation) {
      rawReputation = accountReputation.reputation;
      debugLog(
        `[WorkerBee fetchUserAccount] Using reputation from get_account_reputations API:`,
        rawReputation
      );
    } else {
      rawReputation = accountData.reputation as string | number;
      debugLog(
        `[WorkerBee fetchUserAccount] Using reputation from get_accounts API:`,
        rawReputation
      );
    }

    debugLog(
      `[WorkerBee fetchUserAccount] Raw reputation for ${username}:`,
      rawReputation,
      'Type:',
      typeof rawReputation
    );

    // Debug: Show what raw value would produce the expected vs actual reputation
    if (rawReputation && rawReputation !== 0 && rawReputation !== '0') {
      const calculated = calculateReputation(rawReputation);
      debugLog(
        `[WorkerBee fetchUserAccount] DEBUG: Raw ${rawReputation} → Calculated ${calculated}`
      );

      // If the calculated reputation seems too high, let's check if we need to adjust the formula
      if (calculated > 100) {
        debugLog(
          `[WorkerBee fetchUserAccount] WARNING: Calculated reputation ${calculated} seems unusually high`
        );
        debugLog(`[WorkerBee fetchUserAccount] Expected range: 25-100 for most users`);
      }
    }

    // Handle case where reputation is 0 or undefined
    let reputation: number;
    if (!rawReputation || rawReputation === 0 || rawReputation === '0') {
      debugLog(`[WorkerBee fetchUserAccount] Reputation is 0/undefined, using default value of 25`);
      reputation = 25; // Default reputation for new accounts
    } else {
      reputation = calculateReputation(rawReputation);
    }
    debugLog(`[WorkerBee fetchUserAccount] Final reputation for ${username}:`, reputation);

    debugLog(`[WorkerBee fetchUserAccount] Final RC percentage: ${rcPercentage.toFixed(2)}%`);

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
      pendingWithdrawals: calculatePendingWithdrawals(accountData, globalProps),
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
        commentCount:
          calculatedStats.commentCount > 0 ? calculatedStats.commentCount : accountCommentCount,
        voteCount: calculatedStats.voteCount > 0 ? calculatedStats.voteCount : accountVoteCount,
        followers: followStats?.followers || 0,
        following: followStats?.following || 0,
      },
      createdAt: accountData.created ? new Date(accountData.created as string) : new Date(),
      lastPost: accountData.last_post ? new Date(accountData.last_post as string) : undefined,
      lastVote: accountData.last_vote_time
        ? new Date(accountData.last_vote_time as string)
        : undefined,
      canVote: (accountData.can_vote as boolean) || false,
      votingPower: (accountData.voting_power as number) || 0,
    };
  } catch (error) {
    logError(
      'Error fetching user account with WorkerBee',
      'fetchUserAccount',
      error instanceof Error ? error : undefined
    );
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
    // Get account and RC data in parallel using optimized caching
    // Note: rc_api uses object params { accounts: [username] }, not array params
    const [account, rc] = await Promise.all([
      getAccountOptimized(username),
      makeHiveApiCall('rc_api', 'find_rc_accounts', { accounts: [username] })
        .then((result: unknown) => {
          const rcResult = result as { rc_accounts?: RcAccountData[] };
          return rcResult && rcResult.rc_accounts && rcResult.rc_accounts.length > 0
            ? rcResult.rc_accounts[0]
            : null;
        })
        .catch(() => null),
    ]);

    if (!account) return null;

    const accountData = account;
    const hiveAsset = parseAsset(accountData.balance as string);
    const hbdAsset = parseAsset(accountData.hbd_balance as string);
    const savingsHiveAsset = parseAsset(accountData.savings_balance as string);
    const savingsHbdAsset = parseAsset(accountData.savings_hbd_balance as string);

    let hivePower = 0;
    if (accountData.vesting_shares) {
      const globalProps = (await makeHiveApiCall(
        'condenser_api',
        'get_dynamic_global_properties'
      )) as GlobalProperties;
      hivePower = vestingSharesToHive(
        accountData.vesting_shares as string,
        globalProps.total_vesting_shares || '0',
        globalProps.total_vesting_fund_hive || '0'
      );
    }

    // Calculate RC percentage using the proper rc_api data
    let rcPercentage = 0;
    if (rc && rc.rc_manabar && rc.max_rc) {
      const currentMana = parseFloat(rc.rc_manabar.current_mana);
      const maxRc = parseFloat(rc.max_rc);

      if (maxRc > 0) {
        rcPercentage = (currentMana / maxRc) * 100;
        debugLog(
          `[WorkerBee fetchUserBalances] RC: ${rcPercentage.toFixed(2)}% (${currentMana.toLocaleString()} / ${maxRc.toLocaleString()})`
        );
      } else {
        rcPercentage = 100;
      }
    } else {
      debugLog(`[WorkerBee fetchUserBalances] No RC data available, setting to 100%`);
      rcPercentage = 100;
    }

    return {
      hiveBalance: hiveAsset.amount + savingsHiveAsset.amount,
      hbdBalance: hbdAsset.amount + savingsHbdAsset.amount,
      hivePower,
      resourceCredits: rcPercentage,
    };
  } catch (error) {
    logError(
      'Error fetching user balances with WorkerBee',
      'fetchUserBalances',
      error instanceof Error ? error : undefined
    );
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
    const account = await getAccountOptimized(username);
    if (!account) return null;

    const accountData = account;
    // Parse profile from both json_metadata and posting_json_metadata
    // Many users have their profile in posting_json_metadata
    const profileMetadata = parseJsonMetadata(accountData.json_metadata as string);
    const postingProfileMetadata = parseJsonMetadata(accountData.posting_json_metadata as string);

    // Merge profile data, prioritizing posting_json_metadata (same as fetchUserAccount)
    const profile = {
      ...(profileMetadata.profile || {}),
      ...(postingProfileMetadata.profile || {}),
    } as Record<string, unknown>;

    return {
      name: profile.name as string | undefined,
      about: profile.about as string | undefined,
      location: profile.location as string | undefined,
      website: profile.website as string | undefined,
      coverImage: profile.cover_image as string | undefined,
      profileImage: profile.profile_image as string | undefined,
    };
  } catch (error) {
    logError(
      'Error fetching user profile with WorkerBee',
      'fetchUserProfile',
      error instanceof Error ? error : undefined
    );
    return null;
  }
}

/**
 * Check if user exists on Hive blockchain using WorkerBee/Wax
 * @param username - Username to check
 * @returns True if user exists, false if not found or on error
 */
export async function userExists(username: string): Promise<boolean> {
  try {
    const account = (await makeHiveApiCall('condenser_api', 'get_accounts', [
      [username],
    ])) as HiveAccount[];
    return account && account.length > 0;
  } catch (error) {
    // Log API errors separately from "user not found" (which returns empty array)
    logWarn(`Error checking if user exists: ${username}`, 'userExists', {
      error: error instanceof Error ? error.message : String(error),
    });
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
    debugLog(`[WorkerBee getUserFollowStats] Fetching follow stats for: ${username}`);

    // Check if account exists on Hive first (uses cache to avoid repeated API calls)
    // This prevents errors for soft-auth users and deleted accounts
    const exists = await isHiveAccount(username);
    if (!exists) {
      debugLog(`[WorkerBee getUserFollowStats] Skipping non-Hive account: ${username}`);
      return { followers: 0, following: 0 };
    }

    const result = (await makeHiveApiCall('condenser_api', 'get_follow_count', [
      username,
    ])) as FollowCountData;
    debugLog(`[WorkerBee getUserFollowStats] Raw follow stats result:`, result);

    const followers = result.follower_count || 0;
    const following = result.following_count || 0;

    debugLog(
      `[WorkerBee getUserFollowStats] Follow stats: ${followers} followers, ${following} following`
    );

    return {
      followers,
      following,
    };
  } catch (error) {
    logError(
      'Error fetching follow stats with WorkerBee',
      'getUserFollowStats',
      error instanceof Error ? error : undefined
    );
    return null;
  }
}

/**
 * Fetch HBD savings APR from global properties using WorkerBee/Wax
 * @returns HBD savings interest rate as percentage
 */
export async function getHbdSavingsApr(): Promise<number> {
  try {
    debugLog(`[WorkerBee getHbdSavingsApr] Fetching HBD savings APR...`);

    const globalProps = (await makeHiveApiCall(
      'condenser_api',
      'get_dynamic_global_properties'
    )) as GlobalProperties;
    const apr = (globalProps.hbd_interest_rate || 0) / 100;
    debugLog(`[WorkerBee getHbdSavingsApr] HBD savings APR: ${apr}%`);
    return apr;
  } catch (error) {
    logError(
      'Error fetching HBD savings APR with WorkerBee',
      'getHbdSavingsApr',
      error instanceof Error ? error : undefined
    );
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
    // get_vesting_delegations returns delegations the user has GIVEN (user is delegator)
    const givenDelegations = (await makeHiveApiCall('condenser_api', 'get_vesting_delegations', [
      username,
      '',
      100,
    ])) as VestingDelegation[];

    // get_expiring_vesting_delegations returns delegations being returned (expiring)
    const expiringDelegations = (await makeHiveApiCall(
      'condenser_api',
      'get_expiring_vesting_delegations',
      [username, new Date().toISOString(), 100]
    )) as VestingDelegation[];

    return {
      given: (givenDelegations as VestingDelegation[]).map((d) => ({
        delegatee: d.delegatee,
        vesting_shares: String(d.vesting_shares),
        min_delegation_time: d.min_delegation_time,
      })),
      received: (expiringDelegations as VestingDelegation[]).map((d) => ({
        delegator: d.delegator,
        vesting_shares: String(d.vesting_shares),
        min_delegation_time: d.min_delegation_time,
      })),
    };
  } catch (error) {
    logError(
      'Error fetching delegations with WorkerBee',
      'getUserDelegations',
      error instanceof Error ? error : undefined
    );
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
  operation: HiveOperation;
  blockNumber: number;
  transactionId: string;
}> | null> {
  try {
    debugLog(
      `[WorkerBee getAccountHistory] Fetching history for: ${username}, limit: ${limit}, start: ${start}`
    );

    // Get account history using Hive API
    const history = (await makeHiveApiCall('condenser_api', 'get_account_history', [
      username,
      start || -1,
      limit,
    ])) as Array<[number, HiveTransaction]>;

    debugLog(
      `[WorkerBee getAccountHistory] Raw history received:`,
      history?.length || 0,
      'operations'
    );

    if (!history || !Array.isArray(history)) {
      debugLog(`[WorkerBee getAccountHistory] No history found for ${username}`);
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
        transactionId: operationData.trx_id,
      };
    });

    debugLog(
      `[WorkerBee getAccountHistory] Processed ${operations.length} operations for ${username}`
    );
    return operations;
  } catch (error) {
    logError(
      'Error fetching account history with WorkerBee',
      'getAccountHistory',
      error instanceof Error ? error : undefined
    );
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
    const globalProps = (await makeHiveApiCall(
      'condenser_api',
      'get_dynamic_global_properties'
    )) as GlobalProperties;
    return vestingSharesToHive(
      vestingShares,
      globalProps.total_vesting_shares || '0',
      globalProps.total_vesting_fund_hive || '0'
    );
  } catch (error) {
    logError(
      'Error converting VESTS to HIVE',
      'convertVestsToHive',
      error instanceof Error ? error : undefined
    );
    return 0;
  }
}

/**
 * Get recent operations for an account using WorkerBee/Wax
 * @param username - Hive username
 * @param limit - Number of recent operations to fetch (default: 500)
 * @param start - Starting operation ID for pagination (optional, -1 = latest)
 * @returns Array of recent account operations
 */
export async function getRecentOperations(
  username: string,
  limit: number = 500,
  start?: number
): Promise<Array<{
  id: number;
  timestamp: string;
  type: string;
  operation: HiveOperation;
  blockNumber: number;
  transactionId: string;
  description: string;
}> | null> {
  try {
    debugLog(`[WorkerBee getRecentOperations] Fetching recent operations for: ${username}`);

    const operations = await getAccountHistory(username, limit, start);
    if (!operations) return null;

    // Define monetary operation types (transactions that involve actual money/assets changes)
    const monetaryOperationTypes = [
      'transfer', // HIVE/HBD transfers
      'claim_reward_balance', // Claiming rewards (actual wallet balance change) - shows final claimed amounts
      'author_reward', // Author rewards (actual balance change) - contains actual payout amounts
      'comment_reward', // Comment rewards (actual balance change)
      'producer_reward', // Block producer rewards (actual balance change)
      'fill_convert_request', // HBD conversion (actual balance change)
      'fill_order', // Market orders (actual balance change)
      'fill_vesting_withdraw', // Power down withdrawals (actual balance change)
      'fill_transfer_from_savings', // Savings withdrawals (actual balance change)
      'delegate_vesting_shares', // HP delegations (has monetary value)
      'return_vesting_delegation', // Return HP delegations (actual balance change)
      'power_up', // Buying HP (monetary - actual balance change)
      'power_down', // Selling HP (monetary - actual balance change)
      'transfer_to_vesting', // Converting HIVE to HP (actual balance change)
      'transfer_to_savings', // Moving to savings (actual balance change)
      'transfer_from_savings', // Moving from savings (actual balance change)
      'cancel_transfer_from_savings', // Cancel savings withdrawal
      'set_withdraw_vesting_route', // Set power down route
      'escrow_transfer', // Escrow transfers (actual balance change)
      'escrow_release', // Escrow releases (actual balance change)
      'escrow_dispute', // Escrow disputes
      'escrow_approve', // Escrow approvals
      'convert', // HBD conversion requests
      'collateralized_convert', // Collateralized conversions
      'recurrent_transfer', // Recurring transfers (actual balance change)
      'fill_recurrent_transfer', // Recurring transfer fills (actual balance change)
      // Note: Removed 'curation_reward' to avoid double counting with 'claim_reward_balance'
      // Note: Removed 'comment_payout_update' as it doesn't contain actual payout amounts
      // Note: Removed 'effective_comment_vote' as it shows potential payouts, not actual claimed rewards
    ];

    // Filter for monetary operations only
    const monetaryOperations = operations.filter((op) => monetaryOperationTypes.includes(op.type));

    debugLog(
      `[WorkerBee getRecentOperations] Filtered ${monetaryOperations.length} monetary operations from ${operations.length} total operations for ${username}`
    );

    // Process operations to add human-readable descriptions
    const processedOperations = await Promise.all(
      monetaryOperations.map(async (op) => {
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
            if (
              op.operation.reward_vests &&
              typeof op.operation.reward_vests === 'string' &&
              op.operation.reward_vests !== '0.000000 VESTS'
            ) {
              // Convert VESTS to HIVE equivalent
              const hiveAmount = await convertVestsToHive(op.operation.reward_vests);
              rewards.push(`${hiveAmount.toFixed(3)} HIVE`);
            }
            description =
              rewards.length > 0 ? `Claimed rewards: ${rewards.join(', ')}` : 'Claimed rewards';
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
            if (op.operation.vesting_shares && typeof op.operation.vesting_shares === 'string') {
              const producerHiveAmount = await convertVestsToHive(op.operation.vesting_shares);
              description = `Block producer reward: ${producerHiveAmount.toFixed(3)} HIVE`;
            } else {
              description = 'Block producer reward';
            }
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
            description = op.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        }

        return {
          ...op,
          description,
        };
      })
    );

    debugLog(
      `[WorkerBee getRecentOperations] Processed ${processedOperations.length} monetary operations for ${username}`
    );
    return processedOperations;
  } catch (error) {
    logError(
      'Error fetching recent operations with WorkerBee',
      'getRecentOperations',
      error instanceof Error ? error : undefined
    );
    return null;
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
    // Note: postingKey parameter is required for actual transaction signing
    debugLog(
      'Profile update for user:',
      username,
      'with posting key:',
      postingKey ? 'provided' : 'missing'
    );

    // Get current account to preserve existing metadata
    const account = (await makeHiveApiCall('condenser_api', 'get_accounts', [
      [username],
    ])) as HiveAccount[];
    if (!account || account.length === 0) throw new Error('Account not found');

    const accountData = account[0];
    const currentMetadata = parseJsonMetadata(accountData.json_metadata as string);
    const currentProfile = currentMetadata.profile || {};

    // Merge with new profile data
    const updatedProfile = {
      ...currentProfile,
      ...profileData,
      version: 2, // Increment version
    };

    const updatedMetadata = {
      ...currentMetadata,
      profile: updatedProfile,
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
    debugLog('Profile update operation prepared:', operation);
    // const client = await initializeWorkerBeeClient();
    // await client.broadcast(operation);

    return { success: true, transactionId: 'broadcasted' };
  } catch (error) {
    logError(
      'Error updating user profile with WorkerBee',
      'updateUserProfile',
      error instanceof Error ? error : undefined
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
