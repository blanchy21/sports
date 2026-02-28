/**
 * Hive Engine Type Definitions
 *
 * TypeScript interfaces for Hive Engine API responses and operations.
 */

import type { PremiumTier } from './constants';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Hive Engine JSON-RPC request
 */
export interface HiveEngineRequest {
  jsonrpc: '2.0';
  id: number;
  method: 'find' | 'findOne' | 'getLatestBlockInfo' | 'getBlockInfo';
  params: {
    contract: string;
    table: string;
    query: Record<string, unknown>;
    limit?: number;
    offset?: number;
    indexes?: Array<{ index: string; descending: boolean }>;
  };
}

/**
 * Hive Engine JSON-RPC response
 */
export interface HiveEngineResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result: T | null;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ============================================================================
// Token Types
// ============================================================================

/**
 * Token balance information
 */
export interface TokenBalance {
  /** Account name */
  account: string;
  /** Token symbol */
  symbol: string;
  /** Liquid (available) balance */
  balance: string;
  /** Staked balance */
  stake: string;
  /** Pending unstake amount */
  pendingUnstake: string;
  /** Delegations received */
  delegationsIn: string;
  /** Delegations sent out */
  delegationsOut: string;
  /** Pending undelegations */
  pendingUndelegations: string;
}

/**
 * Parsed token balance with numeric values
 */
export interface ParsedTokenBalance {
  account: string;
  symbol: string;
  liquid: number;
  staked: number;
  pendingUnstake: number;
  delegatedIn: number;
  delegatedOut: number;
  pendingUndelegations: number;
  /** Total balance (liquid + staked + delegatedIn - delegatedOut) */
  total: number;
}

/**
 * Token information from the tokens contract
 */
export interface TokenInfo {
  /** Unique token ID */
  _id: number;
  /** Token issuer account */
  issuer: string;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Token metadata (JSON string) */
  metadata: string;
  /** Decimal precision */
  precision: number;
  /** Maximum supply */
  maxSupply: string;
  /** Current circulating supply */
  supply: string;
  /** Current circulating supply as number */
  circulatingSupply: string;
  /** Whether staking is enabled */
  stakingEnabled: boolean;
  /** Number of days for unstaking */
  unstakingCooldown: number;
  /** Whether delegation is enabled */
  delegationEnabled: boolean;
  /** Whether the token is undelegatable */
  undelegationCooldown: number;
}

/**
 * Parsed token metadata
 */
export interface TokenMetadata {
  url?: string;
  icon?: string;
  desc?: string;
}

// ============================================================================
// Staking Types
// ============================================================================

/**
 * Stake information for a user
 */
export interface StakeInfo {
  /** Account name */
  account: string;
  /** Token symbol */
  symbol: string;
  /** Amount staked */
  staked: number;
  /** Amount pending unstake */
  pendingUnstake: number;
  /** Timestamp when unstaking completes (if any) */
  unstakingCompleteTimestamp: number | null;
  /** Delegated to others */
  delegatedOut: number;
  /** Delegated from others */
  delegatedIn: number;
  /** Estimated APY percentage */
  estimatedAPY: number;
  /** Premium tier based on stake */
  premiumTier: PremiumTier | null;
}

/**
 * Pending unstake record
 */
export interface PendingUnstake {
  _id: string;
  account: string;
  symbol: string;
  quantity: string;
  quantityLeft: string;
  nextTransactionTimestamp: number;
  numberTransactionsLeft: number;
  millisecPerPeriod: number;
  txID: string;
}

/**
 * Delegation record
 */
export interface Delegation {
  _id: string;
  from: string;
  to: string;
  symbol: string;
  quantity: string;
}

// ============================================================================
// Market Types
// ============================================================================

/**
 * Market data from Tribaldex
 */
export interface MarketData {
  /** Token symbol */
  symbol: string;
  /** Current price in HIVE */
  priceHive: number;
  /** 24h price change percentage */
  priceChange24h: number;
  /** 24h trading volume in HIVE */
  volume24h: number;
  /** Highest bid price */
  highestBid: number;
  /** Lowest ask price */
  lowestAsk: number;
  /** Last trade price */
  lastPrice: number;
  /** Market cap in HIVE */
  marketCap: number;
}

/**
 * Order book entry
 */
export interface OrderBookEntry {
  /** Price in HIVE */
  price: string;
  /** Quantity of tokens */
  quantity: string;
  /** Account placing the order */
  account: string;
  /** Order timestamp */
  timestamp: number;
  /** Transaction ID */
  txId: string;
}

/**
 * Order book data
 */
export interface OrderBook {
  /** Buy orders (bids) */
  bids: OrderBookEntry[];
  /** Sell orders (asks) */
  asks: OrderBookEntry[];
}

/**
 * Liquidity pool information
 */
export interface PoolInfo {
  /** Pool token pair */
  tokenPair: string;
  /** Base token symbol */
  baseSymbol: string;
  /** Quote token symbol */
  quoteSymbol: string;
  /** Base token quantity in pool */
  baseQuantity: number;
  /** Quote token quantity in pool */
  quoteQuantity: number;
  /** Total liquidity in HIVE equivalent */
  totalLiquidity: number;
  /** Base token price */
  basePrice: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction from history
 */
export interface Transaction {
  /** Unique transaction ID */
  _id: string;
  /** Block number */
  blockNumber: number;
  /** Transaction ID on chain */
  transactionId: string;
  /** Sender account */
  sender: string;
  /** Contract name */
  contract: string;
  /** Action performed */
  action: string;
  /** Action payload */
  payload: string;
  /** Execution result */
  executedCodeHash: string;
  /** Logs from execution */
  logs: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Parsed transaction for display
 */
export interface ParsedTransaction {
  id: string;
  blockNumber: number;
  txId: string;
  timestamp: Date;
  type: 'transfer' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'market' | 'other';
  from: string;
  to?: string;
  amount?: number;
  symbol: string;
  memo?: string;
  success: boolean;
  logs?: Record<string, unknown>[];
}

/**
 * Transfer record from tokens contract
 */
export interface TransferRecord {
  _id: number;
  from: string;
  to: string;
  symbol: string;
  quantity: string;
  memo?: string;
  timestamp: number;
}

// ============================================================================
// Operation Types (for building transactions)
// ============================================================================

/**
 * Custom JSON operation for Hive Engine
 */
export interface CustomJsonOp {
  /** Operation type identifier */
  id: 'ssc-mainnet-hive';
  /** Accounts that must sign with active key */
  required_auths: string[];
  /** Accounts that must sign with posting key */
  required_posting_auths: string[];
  /** JSON payload */
  json: string;
}

/**
 * Token transfer payload
 */
export interface TransferPayload {
  contractName: 'tokens';
  contractAction: 'transfer';
  contractPayload: {
    symbol: string;
    to: string;
    quantity: string;
    memo?: string;
  };
}

/**
 * Stake tokens payload
 */
export interface StakePayload {
  contractName: 'tokens';
  contractAction: 'stake';
  contractPayload: {
    symbol: string;
    to: string;
    quantity: string;
  };
}

/**
 * Unstake tokens payload
 */
export interface UnstakePayload {
  contractName: 'tokens';
  contractAction: 'unstake';
  contractPayload: {
    symbol: string;
    quantity: string;
  };
}

/**
 * Delegate stake payload
 */
export interface DelegatePayload {
  contractName: 'tokens';
  contractAction: 'delegate';
  contractPayload: {
    symbol: string;
    to: string;
    quantity: string;
  };
}

/**
 * Undelegate stake payload
 */
export interface UndelegatePayload {
  contractName: 'tokens';
  contractAction: 'undelegate';
  contractPayload: {
    symbol: string;
    from: string;
    quantity: string;
  };
}

/**
 * Cancel unstake payload
 */
export interface CancelUnstakePayload {
  contractName: 'tokens';
  contractAction: 'cancelUnstake';
  contractPayload: {
    txID: string;
  };
}

/**
 * Market buy order payload
 */
export interface MarketBuyPayload {
  contractName: 'market';
  contractAction: 'buy';
  contractPayload: {
    symbol: string;
    quantity: string;
    price: string;
  };
}

/**
 * Union type for all operation payloads
 */
export type OperationPayload =
  | TransferPayload
  | StakePayload
  | UnstakePayload
  | DelegatePayload
  | UndelegatePayload
  | CancelUnstakePayload
  | MarketBuyPayload;

// ============================================================================
// Swap Types
// ============================================================================

/**
 * Quote for swapping HIVE → MEDALS via market buy
 */
export interface SwapQuote {
  /** Gross HIVE amount entered by user */
  hiveAmount: number;
  /** Platform fee in HIVE (1%) */
  fee: number;
  /** HIVE amount after fee, deposited to Hive Engine */
  netHive: number;
  /** Estimated MEDALS received */
  estimatedMedals: number;
  /** Average fill price (SWAP.HIVE per MEDALS) */
  averagePrice: number;
  /** Worst fill price across matched orders */
  worstPrice: number;
  /** Price impact percentage */
  priceImpact: number;
  /** Whether the order book has sufficient liquidity */
  sufficient: boolean;
  /** Number of sell orders matched */
  ordersMatched: number;
}

// ============================================================================
// Client Types
// ============================================================================

/**
 * Hive Engine client configuration
 */
export interface HiveEngineClientConfig {
  /** API nodes for failover */
  nodes?: string[];
  /** Request timeout in ms */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

/**
 * Node health status
 */
export interface NodeHealth {
  /** Node URL */
  url: string;
  /** Whether the node is healthy */
  healthy: boolean;
  /** Last response latency in ms */
  latency: number;
  /** Last check timestamp */
  lastCheck: number;
  /** Consecutive failure count */
  failureCount: number;
}

/**
 * Query options for find operations
 */
export interface QueryOptions {
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Index to use for sorting */
  index?: string;
  /** Sort descending */
  descending?: boolean;
}

// ============================================================================
// Reward Types
// ============================================================================

/**
 * Weekly reward distribution record
 */
export interface RewardDistribution {
  /** Week identifier (e.g., "2025-W03") */
  weekId: string;
  /** Distribution type */
  type: 'staking' | 'curator' | 'content';
  /** Total amount distributed */
  totalAmount: number;
  /** Number of recipients */
  recipientCount: number;
  /** Timestamp of distribution */
  timestamp: Date;
  /** Transaction IDs */
  txIds: string[];
}

/**
 * Content reward category
 */
export type ContentRewardCategory =
  | 'most_external_views'
  | 'most_viewed_post'
  | 'most_comments'
  | 'most_engaged_post'
  | 'post_of_week'
  | 'best_newcomer';

/**
 * Content reward entry
 */
export interface ContentReward {
  category: ContentRewardCategory;
  account: string;
  postId?: string;
  value: number;
  amount: number;
  weekId: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: string;
}

/**
 * Balance API response
 */
export interface BalanceResponse {
  liquid: string;
  staked: string;
  pendingUnstake: string;
  delegatedIn: string;
  delegatedOut: string;
  total: string;
  estimatedAPY: string;
  premiumTier: PremiumTier | null;
  hiveValue?: string;
}

/**
 * Market API response
 */
export interface MarketResponse {
  price: string;
  priceChange24h: string;
  volume24h: string;
  marketCap: string;
  highestBid: string;
  lowestAsk: string;
}
