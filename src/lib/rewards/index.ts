/**
 * MEDALS Rewards System
 *
 * Exports for staking rewards, curator rewards, and content metrics tracking.
 */

// Configuration
export {
  MEDALS_ACCOUNTS,
  WEEKLY_STAKING_REWARDS,
  CURATOR_REWARDS,
  CONTENT_REWARDS,
  REWARD_SCHEDULE,
  MINIMUMS,
  TOKEN_CONFIG,
  getPlatformYear,
  getWeeklyStakingPool,
  getCuratorRewardAmount,
} from './config';

// Staking Distribution
export {
  calculateStakingRewards,
  buildRewardTransferOperations,
  estimateStakingAPY,
  validateRewardsBalance,
  getWeekId,
  getRewardsAccount,
  type StakerInfo,
  type RewardDistribution,
  type DistributionResult,
} from './staking-distribution';

// Curator Rewards
export {
  getCuratorAccounts,
  isCurator,
  calculateCuratorReward,
  filterCuratorVotes,
  processCuratorVotes,
  buildCuratorRewardTransfer,
  getVoteUniqueId,
  getDailyKey,
  getCuratorStatsSummary,
  getCuratorRewardsAccount,
  type CuratorVote,
  type CuratorReward,
  type CuratorDailyStats,
} from './curator-rewards';
