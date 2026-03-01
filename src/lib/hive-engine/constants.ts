/**
 * Hive Engine Constants
 *
 * Configuration for MEDALS token and Hive Engine API integration.
 */

/**
 * MEDALS token configuration
 */
export const MEDALS_CONFIG = {
  /** Token symbol on Hive Engine */
  SYMBOL: 'MEDALS',

  /** Decimal precision for token amounts */
  PRECISION: 6,

  /** Hive Engine sidechain contract ID */
  CONTRACT_ID: 'ssc-mainnet-hive',

  /** Platform accounts */
  ACCOUNTS: {
    /** Main platform account */
    MAIN: 'sportsblock',
    /** Burn account for deflationary buybacks */
    BURN: 'medals.burn',
    /** Rewards distribution account (sportsblock main — 5.25M MEDALS liquid) */
    REWARDS: 'sportsblock',
    /** Prediction escrow account */
    PREDICTIONS: 'sp-predictions',
    /** Founder accounts (excluded from public leaderboard) */
    FOUNDERS: ['niallon11', 'blanchy'] as readonly string[],
  },

  /** Beneficiary weight for posts (5% = 500 in Hive terms, where 10000 = 100%) */
  BENEFICIARY_WEIGHT: 500,

  /** Staking reward pools by year (MEDALS per week) */
  STAKING_POOLS: {
    YEAR_1: 30000,
    YEAR_2: 40000,
    YEAR_3: 50000,
    YEAR_4_PLUS: 60000,
  },

  /** Curator reward amount per vote */
  CURATOR_REWARD: {
    YEAR_1_3: 100,
    YEAR_4_PLUS: 150,
  },
} as const;

/**
 * Hive Engine API nodes with failover support
 */
export const HIVE_ENGINE_NODES = [
  'https://api.hive-engine.com/rpc',
  'https://engine.rishipanthee.com',
  'https://herpc.dtools.dev',
  'https://api.primersion.com',
] as const;

/**
 * Hive Engine API configuration
 */
export const HIVE_ENGINE_CONFIG = {
  /** API nodes for failover */
  NODES: HIVE_ENGINE_NODES,

  /** Default node index */
  DEFAULT_NODE_INDEX: 0,

  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 10000,

  /** Maximum retry attempts */
  MAX_RETRIES: 3,

  /** Retry delay in milliseconds */
  RETRY_DELAY: 1000,

  /** Contract endpoints */
  ENDPOINTS: {
    CONTRACTS: '/contracts',
    BLOCKCHAIN: '/blockchain',
  },
} as const;

/**
 * Tribaldex API for market data
 */
export const TRIBALDEX_CONFIG = {
  /** Base API URL */
  API_URL: 'https://api.tribaldex.com',

  /** Market data endpoints */
  ENDPOINTS: {
    METRICS: '/market/metrics',
    OHLCV: '/market/ohlcv',
    TRADES: '/market/trades',
    ORDERBOOK: '/market/orderbook',
  },

  /** Request timeout */
  REQUEST_TIMEOUT: 5000,
} as const;

/**
 * Premium tier thresholds (MEDALS staked)
 */
export const PREMIUM_TIERS = {
  BRONZE: 1000,
  SILVER: 5000,
  GOLD: 25000,
  PLATINUM: 100000,
} as const;

/**
 * Premium tier feature flags
 */
export const PREMIUM_FEATURES = {
  BRONZE: ['ad_free', 'bronze_badge'] as const,
  SILVER: ['ad_free', 'silver_badge', 'priority_curation'] as const,
  GOLD: ['ad_free', 'gold_badge', 'priority_curation', 'exclusive_contests'] as const,
  PLATINUM: [
    'ad_free',
    'platinum_badge',
    'priority_curation',
    'exclusive_contests',
    'direct_support',
  ] as const,
} as const;

/**
 * Hive Engine contract names
 */
export const CONTRACTS = {
  TOKENS: 'tokens',
  MARKET: 'market',
  MARKETPOOLS: 'marketpools',
} as const;

/**
 * Hive Engine contract actions
 */
export const CONTRACT_ACTIONS = {
  // Token actions
  TRANSFER: 'transfer',
  STAKE: 'stake',
  UNSTAKE: 'unstake',
  DELEGATE: 'delegate',
  UNDELEGATE: 'undelegate',
  CANCEL_UNSTAKE: 'cancelUnstake',

  // Market actions
  BUY: 'buy',
  SELL: 'sell',
  CANCEL: 'cancel',
} as const;

/**
 * Cache TTLs for Hive Engine data (in seconds)
 */
export const CACHE_TTLS = {
  /** Token balance - refresh frequently */
  BALANCE: 30,
  /** Staking info */
  STAKE_INFO: 60,
  /** Market price */
  MARKET_PRICE: 30,
  /** Token info (rarely changes) */
  TOKEN_INFO: 300,
  /** Transaction history */
  HISTORY: 60,
  /** Pool liquidity */
  POOL_LIQUIDITY: 60,
} as const;

export type PremiumTier = keyof typeof PREMIUM_TIERS;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[PremiumTier][number];
export type ContractName = (typeof CONTRACTS)[keyof typeof CONTRACTS];
export type ContractAction = (typeof CONTRACT_ACTIONS)[keyof typeof CONTRACT_ACTIONS];
