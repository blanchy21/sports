/**
 * Hive Engine Operations Builder
 *
 * Functions for building custom_json operations for Hive Engine transactions.
 * These operations are signed and broadcast via the wallet integration (Keychain / HiveSigner).
 */

import { MEDALS_CONFIG, CONTRACTS, CONTRACT_ACTIONS } from './constants';
import { formatQuantity, isValidAccountName, isValidQuantity } from './client';
import type {
  CustomJsonOp,
  TransferPayload,
  StakePayload,
  UnstakePayload,
  DelegatePayload,
  UndelegatePayload,
  CancelUnstakePayload,
  MarketBuyPayload,
  OperationPayload,
} from './types';

// ============================================================================
// Operation Builder Helpers
// ============================================================================

/**
 * Build a custom_json operation for Hive Engine
 */
function buildCustomJsonOp(
  account: string,
  payload: OperationPayload,
  useActiveKey: boolean = true
): CustomJsonOp {
  return {
    id: 'ssc-mainnet-hive',
    required_auths: useActiveKey ? [account] : [],
    required_posting_auths: useActiveKey ? [] : [account],
    json: JSON.stringify(payload),
  };
}

/**
 * Validate operation parameters
 */
function validateParams(params: {
  from?: string;
  to?: string;
  quantity?: string;
  symbol?: string;
}): void {
  if (params.from && !isValidAccountName(params.from)) {
    throw new Error(`Invalid account name: ${params.from}`);
  }
  if (params.to && !isValidAccountName(params.to)) {
    throw new Error(`Invalid account name: ${params.to}`);
  }
  if (params.quantity && !isValidQuantity(params.quantity, MEDALS_CONFIG.PRECISION)) {
    throw new Error(`Invalid quantity: ${params.quantity}`);
  }
}

// ============================================================================
// Transfer Operations
// ============================================================================

/**
 * Build a token transfer operation
 *
 * @param from - Sender account
 * @param to - Recipient account
 * @param quantity - Amount to transfer (as string with precision)
 * @param symbol - Token symbol (defaults to MEDALS)
 * @param memo - Optional memo
 * @returns CustomJsonOp ready for signing
 */
export function buildTransferOp(
  from: string,
  to: string,
  quantity: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  memo?: string
): CustomJsonOp {
  validateParams({ from, to, quantity, symbol });

  const payload: TransferPayload = {
    contractName: CONTRACTS.TOKENS,
    contractAction: CONTRACT_ACTIONS.TRANSFER,
    contractPayload: {
      symbol,
      to,
      quantity,
      ...(memo && { memo }),
    },
  };

  return buildCustomJsonOp(from, payload);
}

/**
 * Build a transfer operation from number amount
 */
export function buildTransferOpFromAmount(
  from: string,
  to: string,
  amount: number,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  memo?: string
): CustomJsonOp {
  const quantity = formatQuantity(amount, MEDALS_CONFIG.PRECISION);
  return buildTransferOp(from, to, quantity, symbol, memo);
}

// ============================================================================
// Staking Operations
// ============================================================================

/**
 * Build a stake tokens operation
 *
 * @param account - Account staking tokens
 * @param quantity - Amount to stake
 * @param to - Account to stake to (defaults to self)
 * @param symbol - Token symbol
 * @returns CustomJsonOp ready for signing
 */
export function buildStakeOp(
  account: string,
  quantity: string,
  to?: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  const stakeTarget = to || account;
  validateParams({ from: account, to: stakeTarget, quantity, symbol });

  const payload: StakePayload = {
    contractName: CONTRACTS.TOKENS,
    contractAction: CONTRACT_ACTIONS.STAKE,
    contractPayload: {
      symbol,
      to: stakeTarget,
      quantity,
    },
  };

  return buildCustomJsonOp(account, payload);
}

/**
 * Build a stake operation from number amount
 */
export function buildStakeOpFromAmount(
  account: string,
  amount: number,
  to?: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  const quantity = formatQuantity(amount, MEDALS_CONFIG.PRECISION);
  return buildStakeOp(account, quantity, to, symbol);
}

/**
 * Build an unstake tokens operation
 *
 * @param account - Account unstaking tokens
 * @param quantity - Amount to unstake
 * @param symbol - Token symbol
 * @returns CustomJsonOp ready for signing
 */
export function buildUnstakeOp(
  account: string,
  quantity: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  validateParams({ from: account, quantity, symbol });

  const payload: UnstakePayload = {
    contractName: CONTRACTS.TOKENS,
    contractAction: CONTRACT_ACTIONS.UNSTAKE,
    contractPayload: {
      symbol,
      quantity,
    },
  };

  return buildCustomJsonOp(account, payload);
}

/**
 * Build an unstake operation from number amount
 */
export function buildUnstakeOpFromAmount(
  account: string,
  amount: number,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  const quantity = formatQuantity(amount, MEDALS_CONFIG.PRECISION);
  return buildUnstakeOp(account, quantity, symbol);
}

/**
 * Build a cancel unstake operation
 *
 * @param account - Account canceling unstake
 * @param txId - Transaction ID of the unstake to cancel
 * @returns CustomJsonOp ready for signing
 */
export function buildCancelUnstakeOp(account: string, txId: string): CustomJsonOp {
  if (!txId || typeof txId !== 'string') {
    throw new Error('Invalid transaction ID');
  }

  const payload: CancelUnstakePayload = {
    contractName: CONTRACTS.TOKENS,
    contractAction: CONTRACT_ACTIONS.CANCEL_UNSTAKE,
    contractPayload: {
      txID: txId,
    },
  };

  return buildCustomJsonOp(account, payload);
}

// ============================================================================
// Delegation Operations
// ============================================================================

/**
 * Build a delegate stake operation
 *
 * @param from - Account delegating stake
 * @param to - Account receiving delegation
 * @param quantity - Amount to delegate
 * @param symbol - Token symbol
 * @returns CustomJsonOp ready for signing
 */
export function buildDelegateOp(
  from: string,
  to: string,
  quantity: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  validateParams({ from, to, quantity, symbol });

  if (from === to) {
    throw new Error('Cannot delegate to yourself');
  }

  const payload: DelegatePayload = {
    contractName: CONTRACTS.TOKENS,
    contractAction: CONTRACT_ACTIONS.DELEGATE,
    contractPayload: {
      symbol,
      to,
      quantity,
    },
  };

  return buildCustomJsonOp(from, payload);
}

/**
 * Build a delegate operation from number amount
 */
export function buildDelegateOpFromAmount(
  from: string,
  to: string,
  amount: number,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  const quantity = formatQuantity(amount, MEDALS_CONFIG.PRECISION);
  return buildDelegateOp(from, to, quantity, symbol);
}

/**
 * Build an undelegate stake operation
 *
 * @param account - Account undelegating stake
 * @param from - Account to undelegate from
 * @param quantity - Amount to undelegate
 * @param symbol - Token symbol
 * @returns CustomJsonOp ready for signing
 */
export function buildUndelegateOp(
  account: string,
  from: string,
  quantity: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  validateParams({ from: account, to: from, quantity, symbol });

  const payload: UndelegatePayload = {
    contractName: CONTRACTS.TOKENS,
    contractAction: CONTRACT_ACTIONS.UNDELEGATE,
    contractPayload: {
      symbol,
      from,
      quantity,
    },
  };

  return buildCustomJsonOp(account, payload);
}

/**
 * Build an undelegate operation from number amount
 */
export function buildUndelegateOpFromAmount(
  account: string,
  from: string,
  amount: number,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp {
  const quantity = formatQuantity(amount, MEDALS_CONFIG.PRECISION);
  return buildUndelegateOp(account, from, quantity, symbol);
}

// ============================================================================
// Market Operations
// ============================================================================

/**
 * Build a market buy order operation
 *
 * @param account - Account placing the buy order
 * @param symbol - Token symbol to buy
 * @param quantity - Amount of tokens to buy
 * @param price - Max price per token (SWAP.HIVE)
 * @returns CustomJsonOp ready for signing
 */
export function buildMarketBuyOp(
  account: string,
  symbol: string,
  quantity: string,
  price: string
): CustomJsonOp {
  if (!account || !isValidAccountName(account)) {
    throw new Error(`Invalid account name: ${account}`);
  }

  const payload: MarketBuyPayload = {
    contractName: CONTRACTS.MARKET,
    contractAction: CONTRACT_ACTIONS.BUY,
    contractPayload: {
      symbol,
      quantity,
      price,
    },
  };

  return buildCustomJsonOp(account, payload);
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Build multiple transfer operations (for batch reward distribution)
 *
 * @param from - Sender account
 * @param transfers - Array of { to, amount, memo? }
 * @param symbol - Token symbol
 * @returns Array of CustomJsonOp ready for signing
 */
export function buildBatchTransferOps(
  from: string,
  transfers: Array<{ to: string; amount: number; memo?: string }>,
  symbol: string = MEDALS_CONFIG.SYMBOL
): CustomJsonOp[] {
  return transfers.map((transfer) =>
    buildTransferOpFromAmount(from, transfer.to, transfer.amount, symbol, transfer.memo)
  );
}

// ============================================================================
// Curator Reward Operations
// ============================================================================

/**
 * Build a curator reward transfer operation
 *
 * @param curator - Curator account sending reward
 * @param author - Content author receiving reward
 * @param permlink - Post permlink (for memo)
 * @param rewardAmount - Amount to reward (defaults to current tier)
 * @returns CustomJsonOp ready for signing
 */
export function buildCuratorRewardOp(
  curator: string,
  author: string,
  permlink: string,
  rewardAmount?: number
): CustomJsonOp {
  const amount = rewardAmount || MEDALS_CONFIG.CURATOR_REWARD.YEAR_1_3;
  const memo = `Curator reward for @${author}/${permlink}`;

  return buildTransferOpFromAmount(
    MEDALS_CONFIG.ACCOUNTS.REWARDS,
    author,
    amount,
    MEDALS_CONFIG.SYMBOL,
    memo
  );
}

// ============================================================================
// Staking Reward Operations
// ============================================================================

/**
 * Build staking reward distribution operations
 *
 * @param distributions - Array of { account, amount }
 * @returns Array of CustomJsonOp ready for signing
 */
export function buildStakingRewardOps(
  distributions: Array<{ account: string; amount: number }>
): CustomJsonOp[] {
  const weekId = getWeekId();

  return distributions
    .filter((d) => d.amount > 0)
    .map((d) =>
      buildTransferOpFromAmount(
        MEDALS_CONFIG.ACCOUNTS.REWARDS,
        d.account,
        d.amount,
        MEDALS_CONFIG.SYMBOL,
        `Staking reward ${weekId}`
      )
    );
}

/**
 * Get current week identifier (ISO week format)
 */
function getWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ============================================================================
// Content Reward Operations
// ============================================================================

/**
 * Content reward categories
 */
export const CONTENT_REWARD_AMOUNTS = {
  most_external_views: 5000,
  most_viewed_post: 3000,
  most_comments: 3000,
  most_engaged_post: 2000,
  post_of_week: 2000,
  best_newcomer: 1000,
} as const;

/**
 * Build a content reward transfer operation
 *
 * @param category - Reward category
 * @param account - Winner account
 * @param postId - Post identifier (optional)
 * @returns CustomJsonOp ready for signing
 */
export function buildContentRewardOp(
  category: keyof typeof CONTENT_REWARD_AMOUNTS,
  account: string,
  postId?: string
): CustomJsonOp {
  const amount = CONTENT_REWARD_AMOUNTS[category];
  const weekId = getWeekId();
  const memo = postId ? `${category} reward ${weekId}: ${postId}` : `${category} reward ${weekId}`;

  return buildTransferOpFromAmount(
    MEDALS_CONFIG.ACCOUNTS.REWARDS,
    account,
    amount,
    MEDALS_CONFIG.SYMBOL,
    memo
  );
}

// ============================================================================
// Operation Validation
// ============================================================================

/**
 * Validate a custom_json operation structure
 */
export function validateOperation(op: CustomJsonOp): {
  valid: boolean;
  error?: string;
} {
  if (op.id !== 'ssc-mainnet-hive') {
    return { valid: false, error: 'Invalid operation ID' };
  }

  if (!op.required_auths.length && !op.required_posting_auths.length) {
    return { valid: false, error: 'No signing accounts specified' };
  }

  try {
    const payload = JSON.parse(op.json);
    if (!payload.contractName || !payload.contractAction || !payload.contractPayload) {
      return { valid: false, error: 'Invalid payload structure' };
    }
  } catch {
    return { valid: false, error: 'Invalid JSON payload' };
  }

  return { valid: true };
}

/**
 * Parse an operation to get its details
 */
export function parseOperation(op: CustomJsonOp): {
  contract: string;
  action: string;
  payload: Record<string, unknown>;
  signer: string;
} | null {
  try {
    const data = JSON.parse(op.json);
    return {
      contract: data.contractName,
      action: data.contractAction,
      payload: data.contractPayload,
      signer: op.required_auths[0] || op.required_posting_auths[0],
    };
  } catch {
    return null;
  }
}
