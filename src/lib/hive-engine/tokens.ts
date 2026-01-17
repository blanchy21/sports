/**
 * Hive Engine Token Operations
 *
 * Functions for querying token balances, stake info, and token metadata.
 */

import { getHiveEngineClient, parseQuantity } from './client';
import { MEDALS_CONFIG, CONTRACTS, PREMIUM_TIERS } from './constants';
import type {
  TokenBalance,
  ParsedTokenBalance,
  TokenInfo,
  TokenMetadata,
  StakeInfo,
  PendingUnstake,
  Delegation,
  QueryOptions,
} from './types';
import type { PremiumTier } from './constants';

// ============================================================================
// Balance Queries
// ============================================================================

/**
 * Get token balance for an account
 */
export async function getTokenBalance(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<TokenBalance | null> {
  const client = getHiveEngineClient();

  const balance = await client.findOne<TokenBalance>(CONTRACTS.TOKENS, 'balances', {
    account,
    symbol,
  });

  return balance;
}

/**
 * Get parsed token balance with numeric values
 */
export async function getParsedBalance(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<ParsedTokenBalance | null> {
  const balance = await getTokenBalance(account, symbol);

  if (!balance) {
    return null;
  }

  const liquid = parseQuantity(balance.balance);
  const staked = parseQuantity(balance.stake);
  const pendingUnstake = parseQuantity(balance.pendingUnstake);
  const delegatedIn = parseQuantity(balance.delegationsIn);
  const delegatedOut = parseQuantity(balance.delegationsOut);
  const pendingUndelegations = parseQuantity(balance.pendingUndelegations);

  return {
    account: balance.account,
    symbol: balance.symbol,
    liquid,
    staked,
    pendingUnstake,
    delegatedIn,
    delegatedOut,
    pendingUndelegations,
    total: liquid + staked + delegatedIn - delegatedOut,
  };
}

/**
 * Get all token balances for an account
 */
export async function getAllBalances(account: string): Promise<TokenBalance[]> {
  const client = getHiveEngineClient();

  const balances = await client.find<TokenBalance>(CONTRACTS.TOKENS, 'balances', {
    account,
  });

  return balances;
}

/**
 * Get MEDALS balance with premium tier info
 */
export async function getMedalsBalance(account: string): Promise<{
  liquid: number;
  staked: number;
  pendingUnstake: number;
  delegatedIn: number;
  delegatedOut: number;
  total: number;
  premiumTier: PremiumTier | null;
} | null> {
  const balance = await getParsedBalance(account, MEDALS_CONFIG.SYMBOL);

  if (!balance) {
    return null;
  }

  const effectiveStake = balance.staked + balance.delegatedIn - balance.delegatedOut;
  const premiumTier = getPremiumTier(effectiveStake);

  return {
    ...balance,
    premiumTier,
  };
}

/**
 * Get balances for multiple accounts (batch query)
 */
export async function getBalancesForAccounts(
  accounts: string[],
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<Map<string, TokenBalance>> {
  const client = getHiveEngineClient();

  const balances = await client.find<TokenBalance>(CONTRACTS.TOKENS, 'balances', {
    account: { $in: accounts },
    symbol,
  });

  const balanceMap = new Map<string, TokenBalance>();
  balances.forEach((balance) => {
    balanceMap.set(balance.account, balance);
  });

  return balanceMap;
}

// ============================================================================
// Staking Queries
// ============================================================================

/**
 * Get detailed stake information for an account
 */
export async function getStakeInfo(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<StakeInfo | null> {
  const balance = await getParsedBalance(account, symbol);

  if (!balance) {
    return null;
  }

  // Get pending unstakes
  const pendingUnstakes = await getPendingUnstakes(account, symbol);
  const nextUnstakeTimestamp =
    pendingUnstakes.length > 0
      ? Math.min(...pendingUnstakes.map((u) => u.nextTransactionTimestamp))
      : null;

  // Calculate effective stake for premium tier
  const effectiveStake = balance.staked + balance.delegatedIn - balance.delegatedOut;

  // Calculate estimated APY
  const estimatedAPY = await calculateEstimatedAPY(effectiveStake, symbol);

  return {
    account,
    symbol,
    staked: balance.staked,
    pendingUnstake: balance.pendingUnstake,
    unstakingCompleteTimestamp: nextUnstakeTimestamp,
    delegatedOut: balance.delegatedOut,
    delegatedIn: balance.delegatedIn,
    estimatedAPY,
    premiumTier: getPremiumTier(effectiveStake),
  };
}

/**
 * Get pending unstakes for an account
 */
export async function getPendingUnstakes(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<PendingUnstake[]> {
  const client = getHiveEngineClient();

  const unstakes = await client.find<PendingUnstake>(CONTRACTS.TOKENS, 'pendingUnstakes', {
    account,
    symbol,
  });

  return unstakes;
}

/**
 * Get delegations sent by an account
 */
export async function getDelegationsOut(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<Delegation[]> {
  const client = getHiveEngineClient();

  const delegations = await client.find<Delegation>(CONTRACTS.TOKENS, 'delegations', {
    from: account,
    symbol,
  });

  return delegations;
}

/**
 * Get delegations received by an account
 */
export async function getDelegationsIn(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<Delegation[]> {
  const client = getHiveEngineClient();

  const delegations = await client.find<Delegation>(CONTRACTS.TOKENS, 'delegations', {
    to: account,
    symbol,
  });

  return delegations;
}

/**
 * Get all stakers for a token (for reward distribution)
 */
export async function getAllStakers(
  symbol: string = MEDALS_CONFIG.SYMBOL,
  options: QueryOptions = {}
): Promise<TokenBalance[]> {
  const client = getHiveEngineClient();

  // Query accounts with non-zero stake
  const stakers = await client.find<TokenBalance>(
    CONTRACTS.TOKENS,
    'balances',
    {
      symbol,
      stake: { $gt: '0' },
    },
    {
      limit: options.limit || 1000,
      offset: options.offset || 0,
    }
  );

  return stakers;
}

/**
 * Get total staked amount for a token
 */
export async function getTotalStaked(symbol: string = MEDALS_CONFIG.SYMBOL): Promise<number> {
  const tokenInfo = await getTokenInfo(symbol);

  if (!tokenInfo) {
    return 0;
  }

  // The supply minus circulating gives us locked tokens
  // For a more accurate count, we'd need to sum all stakes
  const stakers = await getAllStakers(symbol, { limit: 10000 });
  const totalStaked = stakers.reduce((sum, s) => sum + parseQuantity(s.stake), 0);

  return totalStaked;
}

// ============================================================================
// Token Info Queries
// ============================================================================

/**
 * Get token information
 */
export async function getTokenInfo(symbol: string = MEDALS_CONFIG.SYMBOL): Promise<TokenInfo | null> {
  const client = getHiveEngineClient();

  const token = await client.findOne<TokenInfo>(CONTRACTS.TOKENS, 'tokens', {
    symbol,
  });

  return token;
}

/**
 * Get parsed token metadata
 */
export async function getTokenMetadata(
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<TokenMetadata | null> {
  const tokenInfo = await getTokenInfo(symbol);

  if (!tokenInfo?.metadata) {
    return null;
  }

  try {
    return JSON.parse(tokenInfo.metadata);
  } catch {
    return null;
  }
}

/**
 * Check if a token exists
 */
export async function tokenExists(symbol: string): Promise<boolean> {
  const token = await getTokenInfo(symbol);
  return token !== null;
}

// ============================================================================
// Premium Tier Functions
// ============================================================================

/**
 * Get premium tier based on staked amount
 */
export function getPremiumTier(stakedAmount: number): PremiumTier | null {
  if (stakedAmount >= PREMIUM_TIERS.PLATINUM) return 'PLATINUM';
  if (stakedAmount >= PREMIUM_TIERS.GOLD) return 'GOLD';
  if (stakedAmount >= PREMIUM_TIERS.SILVER) return 'SILVER';
  if (stakedAmount >= PREMIUM_TIERS.BRONZE) return 'BRONZE';
  return null;
}

/**
 * Check if account has premium status
 */
export async function hasPremiumStatus(account: string): Promise<boolean> {
  const balance = await getMedalsBalance(account);
  return balance?.premiumTier !== null;
}

/**
 * Get premium tier for account
 */
export async function getAccountPremiumTier(account: string): Promise<PremiumTier | null> {
  const balance = await getMedalsBalance(account);
  return balance?.premiumTier || null;
}

// ============================================================================
// APY Calculations
// ============================================================================

/**
 * Get current staking pool based on year
 */
export function getCurrentStakingPool(): number {
  const startYear = 2025; // Project start year
  const currentYear = new Date().getFullYear();
  const yearsActive = currentYear - startYear + 1;

  if (yearsActive <= 1) return MEDALS_CONFIG.STAKING_POOLS.YEAR_1;
  if (yearsActive === 2) return MEDALS_CONFIG.STAKING_POOLS.YEAR_2;
  if (yearsActive === 3) return MEDALS_CONFIG.STAKING_POOLS.YEAR_3;
  return MEDALS_CONFIG.STAKING_POOLS.YEAR_4_PLUS;
}

/**
 * Calculate estimated APY for staking
 */
export async function calculateEstimatedAPY(
  userStake: number,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<number> {
  if (userStake <= 0) return 0;

  const totalStaked = await getTotalStaked(symbol);
  if (totalStaked <= 0) return 0;

  const weeklyPool = getCurrentStakingPool();
  const weeklyReward = (userStake / totalStaked) * weeklyPool;
  const annualReward = weeklyReward * 52;
  const apy = (annualReward / userStake) * 100;

  return Math.round(apy * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate estimated weekly reward for a stake amount
 */
export async function calculateWeeklyReward(
  stakeAmount: number,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<number> {
  if (stakeAmount <= 0) return 0;

  const totalStaked = await getTotalStaked(symbol);
  if (totalStaked <= 0) return 0;

  const weeklyPool = getCurrentStakingPool();
  return (stakeAmount / totalStaked) * weeklyPool;
}

// ============================================================================
// Richlist / Top Holders
// ============================================================================

/**
 * Get top token holders
 */
export async function getTopHolders(
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 100
): Promise<Array<{ account: string; balance: number; stake: number; total: number }>> {
  const client = getHiveEngineClient();

  const holders = await client.find<TokenBalance>(
    CONTRACTS.TOKENS,
    'balances',
    { symbol },
    {
      limit,
      index: 'balance',
      descending: true,
    }
  );

  return holders.map((h) => ({
    account: h.account,
    balance: parseQuantity(h.balance),
    stake: parseQuantity(h.stake),
    total: parseQuantity(h.balance) + parseQuantity(h.stake),
  }));
}

/**
 * Get top stakers
 */
export async function getTopStakers(
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 100
): Promise<Array<{ account: string; stake: number }>> {
  const stakers = await getAllStakers(symbol, { limit });

  return stakers
    .map((s) => ({
      account: s.account,
      stake: parseQuantity(s.stake),
    }))
    .sort((a, b) => b.stake - a.stake);
}
