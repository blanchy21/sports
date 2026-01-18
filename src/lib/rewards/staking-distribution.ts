/**
 * Staking Rewards Distribution Logic
 *
 * Calculates and distributes weekly staking rewards proportionally
 * to all MEDALS token stakers.
 */

import { getWeeklyStakingPool, MEDALS_ACCOUNTS, MINIMUMS } from './config';

/**
 * Represents a staker's information for reward calculation
 */
export interface StakerInfo {
  account: string;
  staked: number;
}

/**
 * Represents a calculated reward distribution
 */
export interface RewardDistribution {
  account: string;
  amount: number;
  percentage: number;
}

/**
 * Result of the distribution calculation
 */
export interface DistributionResult {
  weeklyPool: number;
  totalStaked: number;
  stakerCount: number;
  eligibleStakerCount: number;
  distributions: RewardDistribution[];
  timestamp: Date;
  weekId: string;
}

/**
 * Generate a unique week identifier for idempotency
 * Format: YYYY-WW (ISO week number)
 */
export function getWeekId(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  // Get first day of year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Calculate staking rewards for all eligible stakers
 *
 * @param stakers - Array of all staker accounts with their staked amounts
 * @returns Distribution result with calculated rewards
 */
export function calculateStakingRewards(
  stakers: StakerInfo[]
): DistributionResult {
  const weeklyPool = getWeeklyStakingPool();
  const timestamp = new Date();
  const weekId = getWeekId(timestamp);

  // Filter out accounts below minimum threshold
  const eligibleStakers = stakers.filter(
    (s) => s.staked >= MINIMUMS.STAKING_REWARD_THRESHOLD
  );

  // Calculate total staked among eligible stakers
  const totalStaked = eligibleStakers.reduce((sum, s) => sum + s.staked, 0);

  // If no one is staking, return empty distribution
  if (totalStaked === 0) {
    return {
      weeklyPool,
      totalStaked: 0,
      stakerCount: stakers.length,
      eligibleStakerCount: 0,
      distributions: [],
      timestamp,
      weekId,
    };
  }

  // Calculate proportional rewards
  const distributions: RewardDistribution[] = eligibleStakers.map((staker) => {
    const percentage = (staker.staked / totalStaked) * 100;
    const amount = (staker.staked / totalStaked) * weeklyPool;

    return {
      account: staker.account,
      amount: Number(amount.toFixed(3)), // MEDALS has 3 decimal precision
      percentage: Number(percentage.toFixed(4)),
    };
  });

  // Sort by amount descending for easier review
  distributions.sort((a, b) => b.amount - a.amount);

  return {
    weeklyPool,
    totalStaked,
    stakerCount: stakers.length,
    eligibleStakerCount: eligibleStakers.length,
    distributions,
    timestamp,
    weekId,
  };
}

/**
 * Build Hive Engine transfer operations for reward distribution
 *
 * @param distributions - Array of reward distributions
 * @param memo - Memo to include with transfers
 * @returns Array of custom_json operation payloads
 */
export function buildRewardTransferOperations(
  distributions: RewardDistribution[],
  memo: string = 'Weekly MEDALS staking reward'
): Array<{
  contractName: string;
  contractAction: string;
  contractPayload: {
    symbol: string;
    to: string;
    quantity: string;
    memo: string;
  };
}> {
  return distributions
    .filter((d) => d.amount > 0)
    .map((distribution) => ({
      contractName: 'tokens',
      contractAction: 'transfer',
      contractPayload: {
        symbol: 'MEDALS',
        to: distribution.account,
        quantity: distribution.amount.toFixed(3),
        memo,
      },
    }));
}

/**
 * Estimate APY based on current staking data
 *
 * @param stakedAmount - Amount staked by the user
 * @param totalStaked - Total amount staked platform-wide
 * @returns Estimated annual percentage yield
 */
export function estimateStakingAPY(
  stakedAmount: number,
  totalStaked: number
): number {
  if (totalStaked === 0 || stakedAmount === 0) return 0;

  const weeklyPool = getWeeklyStakingPool();
  const weeklyReward = (stakedAmount / totalStaked) * weeklyPool;
  const annualReward = weeklyReward * 52;
  const apy = (annualReward / stakedAmount) * 100;

  return Number(apy.toFixed(2));
}

/**
 * Validate that the rewards account has sufficient balance
 *
 * @param availableBalance - Current balance of rewards account
 * @param requiredAmount - Total amount needed for distribution
 * @returns Validation result
 */
export function validateRewardsBalance(
  availableBalance: number,
  requiredAmount: number
): { valid: boolean; shortfall: number; message: string } {
  if (availableBalance >= requiredAmount) {
    return {
      valid: true,
      shortfall: 0,
      message: `Sufficient balance: ${availableBalance} MEDALS available for ${requiredAmount} MEDALS distribution`,
    };
  }

  const shortfall = requiredAmount - availableBalance;
  return {
    valid: false,
    shortfall,
    message: `Insufficient balance: ${availableBalance} MEDALS available, need ${requiredAmount} MEDALS (shortfall: ${shortfall} MEDALS)`,
  };
}

/**
 * Get the rewards source account
 */
export function getRewardsAccount(): string {
  return MEDALS_ACCOUNTS.REWARDS;
}
