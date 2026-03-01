/**
 * MEDALS Rewards Configuration
 *
 * Based on the MEDALS Whitepaper v1.0
 * Defines reward pools, distribution schedules, and platform accounts.
 */

/**
 * Platform accounts for MEDALS token operations
 */
export const MEDALS_ACCOUNTS = {
  /** Main platform account (also the rewards source — 5.25M MEDALS liquid) */
  MAIN: 'sportsblock',
  /** Account used for reward distribution transfers */
  REWARDS: 'sportsblock',
  /** Burn account for deflationary mechanics */
  BURN: 'medals-burn',
} as const;

/**
 * Fixed annual percentage rate for staking rewards.
 * Each staker earns (staked * STAKING_APR / 52) MEDALS per week.
 */
export const STAKING_APR = 0.1;

/**
 * Get the current platform year (1-indexed)
 * Year 1 starts from platform launch date
 */
export function getPlatformYear(): number {
  const launchDate = new Date('2026-04-01'); // Platform launch: April 2026
  const now = new Date();
  const diffYears = Math.floor(
    (now.getTime() - launchDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  return Math.max(1, diffYears + 1);
}

/**
 * Weekly staking reward pool by platform year
 * From MEDALS whitepaper: 30K (Y1) → 40K (Y2) → 50K (Y3) → 60K (Y4+)
 */
export const WEEKLY_STAKING_REWARDS: Record<number, number> = {
  1: 30000, // Year 1: 30,000 MEDALS/week
  2: 40000, // Year 2: 40,000 MEDALS/week
  3: 50000, // Year 3: 50,000 MEDALS/week
  4: 60000, // Year 4+: 60,000 MEDALS/week
};

/**
 * Get the weekly staking reward pool for a given total staked amount.
 * Under the 10% APR model, the pool = totalStaked * STAKING_APR / 52.
 *
 * @deprecated Prefer calculating per-staker rewards directly via STAKING_APR.
 *             Kept for backward compatibility — returns 0 without totalStaked.
 */
export function getWeeklyStakingPool(totalStaked: number = 0): number {
  return (totalStaked * STAKING_APR) / 52;
}

/**
 * Curator reward configuration
 */
export const CURATOR_REWARDS = {
  /** MEDALS per curator vote in Years 1-3 */
  AMOUNT_Y1_3: 100,
  /** MEDALS per curator vote in Year 4+ */
  AMOUNT_Y4_PLUS: 150,
  /** Maximum votes per curator per day */
  MAX_VOTES_PER_DAY: 5,
  /** Number of designated curators */
  CURATOR_COUNT: 4,
} as const;

/**
 * Get curator reward amount based on platform year
 */
export function getCuratorRewardAmount(): number {
  const year = getPlatformYear();
  return year >= 4 ? CURATOR_REWARDS.AMOUNT_Y4_PLUS : CURATOR_REWARDS.AMOUNT_Y1_3;
}

/**
 * Weekly content reward categories
 * From MEDALS whitepaper
 */
export const CONTENT_REWARDS = {
  /** Most external views (off-platform referrals) */
  MOST_EXTERNAL_VIEWS: {
    name: 'Most External Views',
    description: 'Posts bringing the most traffic from external sources',
    minReward: 5000,
    maxReward: 6000,
    winners: 1,
  },
  /** Most viewed post on platform */
  MOST_VIEWED_POST: {
    name: 'Most Viewed Post',
    description: 'The most viewed post on Sportsblock this week',
    reward: 3000,
    winners: 1,
  },
  /** Most comments made by user */
  MOST_COMMENTS: {
    name: 'Most Active Commenter',
    description: 'User who made the most quality comments',
    reward: 3000,
    winners: 1,
  },
  /** Most engaged post (votes + comments + shares) */
  MOST_ENGAGED_POST: {
    name: 'Most Engaged Post',
    description: 'Post with highest total engagement',
    reward: 2000,
    winners: 1,
  },
  /** Curator-selected post of the week */
  POST_OF_THE_WEEK: {
    name: 'Post of the Week',
    description: 'Selected by our curator team',
    reward: 2000,
    winners: 1,
  },
  /** Best newcomer (Year 4+) */
  BEST_NEWCOMER: {
    name: 'Best Newcomer',
    description: 'Outstanding new community member',
    reward: 1000,
    winners: 1,
    minPlatformYear: 4,
  },
} as const;

/**
 * Reward distribution schedule
 */
export const REWARD_SCHEDULE = {
  /** Staking rewards distributed every Sunday at midnight UTC */
  STAKING: '0 0 * * 0',
  /** Content rewards distributed every Monday at midnight UTC */
  CONTENT: '0 0 * * 1',
  /** Curator rewards processed every 15 minutes */
  CURATOR: '*/15 * * * *',
} as const;

/**
 * Minimum amounts for various operations
 */
export const MINIMUMS = {
  /** Minimum staked balance to receive staking rewards */
  STAKING_REWARD_THRESHOLD: 1, // 1 MEDALS
  /** Minimum transfer amount */
  TRANSFER_AMOUNT: 0.001,
} as const;

/**
 * Token configuration
 */
export const TOKEN_CONFIG = {
  SYMBOL: 'MEDALS',
  PRECISION: 3,
  CONTRACT_ID: 'ssc-mainnet-hive',
} as const;
