/**
 * Hive Engine Module
 *
 * Provides integration with Hive Engine sidechain for MEDALS token operations.
 *
 * @example
 * ```typescript
 * import {
 *   getMedalsBalance,
 *   buildStakeOp,
 *   getMarketData,
 * } from '@/lib/hive-engine';
 *
 * // Get user's MEDALS balance
 * const balance = await getMedalsBalance('username');
 *
 * // Build a stake operation
 * const op = buildStakeOpFromAmount('username', 100);
 *
 * // Get market data
 * const market = await getMarketData();
 * ```
 */

// ============================================================================
// Constants
// ============================================================================

export {
  MEDALS_CONFIG,
  HIVE_ENGINE_NODES,
  HIVE_ENGINE_CONFIG,
  TRIBALDEX_CONFIG,
  PREMIUM_TIERS,
  PREMIUM_FEATURES,
  CONTRACTS,
  CONTRACT_ACTIONS,
  CACHE_TTLS,
} from './constants';

export type { PremiumTier, PremiumFeature, ContractName, ContractAction } from './constants';

// ============================================================================
// Types
// ============================================================================

export type {
  // API types
  HiveEngineRequest,
  HiveEngineResponse,

  // Token types
  TokenBalance,
  ParsedTokenBalance,
  TokenInfo,
  TokenMetadata,

  // Staking types
  StakeInfo,
  PendingUnstake,
  Delegation,

  // Market types
  MarketData,
  OrderBook,
  OrderBookEntry,
  PoolInfo,

  // Transaction types
  Transaction,
  ParsedTransaction,
  TransferRecord,

  // Operation types
  CustomJsonOp,
  TransferPayload,
  StakePayload,
  UnstakePayload,
  DelegatePayload,
  UndelegatePayload,
  CancelUnstakePayload,
  OperationPayload,

  // Client types
  HiveEngineClientConfig,
  NodeHealth,
  QueryOptions,

  // Reward types
  RewardDistribution,
  ContentRewardCategory,
  ContentReward,

  // API response types
  ApiResponse,
  BalanceResponse,
  MarketResponse,
} from './types';

// ============================================================================
// Client
// ============================================================================

export {
  HiveEngineClient,
  getHiveEngineClient,
  resetHiveEngineClient,
  getNodeHealthStatus,
  formatQuantity,
  parseQuantity,
  isValidAccountName,
  isValidQuantity,
} from './client';

// ============================================================================
// Token Operations (Read)
// ============================================================================

export {
  // Balance queries
  getTokenBalance,
  getParsedBalance,
  getAllBalances,
  getMedalsBalance,
  getBalancesForAccounts,

  // Staking queries
  getStakeInfo,
  getPendingUnstakes,
  getDelegationsOut,
  getDelegationsIn,
  getAllStakers,
  getTotalStaked,

  // Token info
  getTokenInfo,
  getTokenMetadata,
  tokenExists,

  // Premium tier
  getPremiumTier,
  hasPremiumStatus,
  getAccountPremiumTier,

  // APY calculations
  getCurrentStakingPool,
  calculateEstimatedAPY,
  calculateWeeklyReward,

  // Richlist
  getTopHolders,
  getTopStakers,
} from './tokens';

// ============================================================================
// Token Operations (Write)
// ============================================================================

export {
  // Transfer operations
  buildTransferOp,
  buildTransferOpFromAmount,

  // Staking operations
  buildStakeOp,
  buildStakeOpFromAmount,
  buildUnstakeOp,
  buildUnstakeOpFromAmount,
  buildCancelUnstakeOp,

  // Delegation operations
  buildDelegateOp,
  buildDelegateOpFromAmount,
  buildUndelegateOp,
  buildUndelegateOpFromAmount,

  // Batch operations
  buildBatchTransferOps,

  // Reward operations
  buildCuratorRewardOp,
  buildStakingRewardOps,
  buildContentRewardOp,
  CONTENT_REWARD_AMOUNTS,

  // Validation
  validateOperation,
  parseOperation,
} from './operations';

// ============================================================================
// Market Data
// ============================================================================

export {
  // Market metrics
  getMarketMetrics,
  getMarketDataFromHiveEngine,
  getMarketData,

  // Order book
  getOrderBook,
  getAggregatedOrderBook,

  // Liquidity pools
  getPoolInfo,
  getMedalsPoolInfo,

  // Price calculations
  calculateHiveValue,
  calculateTokenAmount,
  calculatePriceImpact,

  // Market statistics
  getMarketStats,
} from './market';

// ============================================================================
// Transaction History
// ============================================================================

export {
  // Transfer history
  getTransferHistory,
  getIncomingTransfers,
  getOutgoingTransfers,
  getParsedHistory,

  // Staking history
  getStakingHistory,

  // Reward history
  getRewardsReceived,
  getTotalRewardsEarned,

  // Recent activity
  getRecentActivity,

  // Distribution history
  getDistributionHistory,
  getWeeklyDistributionSummary,

  // Statistics
  getAccountStats,
} from './history';
