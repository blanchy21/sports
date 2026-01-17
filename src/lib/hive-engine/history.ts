/**
 * Hive Engine Transaction History
 *
 * Functions for querying transaction history and token transfers.
 */

import { parseQuantity } from './client';
import { MEDALS_CONFIG } from './constants';
import type { TransferRecord, ParsedTransaction, QueryOptions } from './types';

// ============================================================================
// Transfer History
// ============================================================================

/**
 * Account History API base URL
 * Hive Engine has a separate API for account history
 */
const ACCOUNT_HISTORY_API = 'https://accounts.hive-engine.com/accountHistory';

/**
 * Get token transfer history for an account
 */
export async function getTransferHistory(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 100,
  offset: number = 0
): Promise<TransferRecord[]> {
  try {
    const params = new URLSearchParams({
      account,
      symbol,
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(`${ACCOUNT_HISTORY_API}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('[HiveEngine] Failed to fetch transfer history:', error);
    return [];
  }
}

/**
 * Get incoming transfers for an account
 */
export async function getIncomingTransfers(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 50
): Promise<TransferRecord[]> {
  const history = await getTransferHistory(account, symbol, limit * 2);
  return history.filter((tx) => tx.to === account);
}

/**
 * Get outgoing transfers for an account
 */
export async function getOutgoingTransfers(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 50
): Promise<TransferRecord[]> {
  const history = await getTransferHistory(account, symbol, limit * 2);
  return history.filter((tx) => tx.from === account);
}

// ============================================================================
// Parsed Transaction History
// ============================================================================

/**
 * Parse a transfer record into a more usable format
 */
function parseTransferRecord(record: TransferRecord): ParsedTransaction {
  return {
    id: String(record._id),
    blockNumber: 0, // Not available in transfer records
    txId: '',
    timestamp: new Date(record.timestamp * 1000),
    type: 'transfer',
    from: record.from,
    to: record.to,
    amount: parseQuantity(record.quantity),
    symbol: record.symbol,
    memo: record.memo,
    success: true,
  };
}

/**
 * Get parsed transaction history
 */
export async function getParsedHistory(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  options: QueryOptions = {}
): Promise<ParsedTransaction[]> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const transfers = await getTransferHistory(account, symbol, limit, offset);
  return transfers.map(parseTransferRecord);
}

// ============================================================================
// Staking History
// ============================================================================

/**
 * Staking action record from history
 */
interface StakingAction {
  _id: number;
  account: string;
  symbol: string;
  quantity: string;
  action: 'stake' | 'unstakeStart' | 'unstakeDone' | 'delegate' | 'undelegate';
  to?: string;
  from?: string;
  timestamp: number;
}

/**
 * Get staking action history for an account
 */
export async function getStakingHistory(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 50
): Promise<StakingAction[]> {
  try {
    const params = new URLSearchParams({
      account,
      symbol,
      limit: String(limit),
      type: 'staking',
    });

    const response = await fetch(`${ACCOUNT_HISTORY_API}?${params}`);

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch {
    return [];
  }
}

// ============================================================================
// Reward History
// ============================================================================

/**
 * Get rewards received by an account
 */
export async function getRewardsReceived(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 100
): Promise<Array<{
  type: 'staking' | 'curator' | 'content' | 'other';
  amount: number;
  from: string;
  memo?: string;
  timestamp: Date;
}>> {
  const incoming = await getIncomingTransfers(account, symbol, limit);

  return incoming.map((tx) => {
    let type: 'staking' | 'curator' | 'content' | 'other' = 'other';

    if (tx.from === MEDALS_CONFIG.ACCOUNTS.REWARDS) {
      if (tx.memo?.includes('Staking reward')) {
        type = 'staking';
      } else if (tx.memo?.includes('Curator reward')) {
        type = 'curator';
      } else if (tx.memo?.includes('reward')) {
        type = 'content';
      }
    }

    return {
      type,
      amount: parseQuantity(tx.quantity),
      from: tx.from,
      memo: tx.memo,
      timestamp: new Date(tx.timestamp * 1000),
    };
  });
}

/**
 * Get total rewards earned by an account
 */
export async function getTotalRewardsEarned(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<{
  total: number;
  staking: number;
  curator: number;
  content: number;
  other: number;
}> {
  const rewards = await getRewardsReceived(account, symbol, 1000);

  const totals = {
    total: 0,
    staking: 0,
    curator: 0,
    content: 0,
    other: 0,
  };

  rewards.forEach((r) => {
    totals.total += r.amount;
    totals[r.type] += r.amount;
  });

  return totals;
}

// ============================================================================
// Recent Activity
// ============================================================================

/**
 * Get recent activity for an account (all types combined)
 */
export async function getRecentActivity(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 20
): Promise<Array<{
  type: 'transfer_in' | 'transfer_out' | 'stake' | 'unstake' | 'delegate' | 'reward';
  amount: number;
  counterparty?: string;
  memo?: string;
  timestamp: Date;
}>> {
  const [transfers, stakingActions] = await Promise.all([
    getTransferHistory(account, symbol, limit),
    getStakingHistory(account, symbol, limit),
  ]);

  const activities: Array<{
    type: 'transfer_in' | 'transfer_out' | 'stake' | 'unstake' | 'delegate' | 'reward';
    amount: number;
    counterparty?: string;
    memo?: string;
    timestamp: Date;
  }> = [];

  // Add transfers
  transfers.forEach((tx) => {
    const isIncoming = tx.to === account;
    const isReward = tx.from === MEDALS_CONFIG.ACCOUNTS.REWARDS;

    activities.push({
      type: isReward ? 'reward' : isIncoming ? 'transfer_in' : 'transfer_out',
      amount: parseQuantity(tx.quantity),
      counterparty: isIncoming ? tx.from : tx.to,
      memo: tx.memo,
      timestamp: new Date(tx.timestamp * 1000),
    });
  });

  // Add staking actions
  stakingActions.forEach((action) => {
    let type: 'stake' | 'unstake' | 'delegate' = 'stake';
    if (action.action === 'unstakeStart' || action.action === 'unstakeDone') {
      type = 'unstake';
    } else if (action.action === 'delegate' || action.action === 'undelegate') {
      type = 'delegate';
    }

    activities.push({
      type,
      amount: parseQuantity(action.quantity),
      counterparty: action.to || action.from,
      timestamp: new Date(action.timestamp * 1000),
    });
  });

  // Sort by timestamp descending
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return activities.slice(0, limit);
}

// ============================================================================
// Distribution History (Admin)
// ============================================================================

/**
 * Get reward distributions sent from the rewards account
 */
export async function getDistributionHistory(
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 100
): Promise<TransferRecord[]> {
  return getOutgoingTransfers(MEDALS_CONFIG.ACCOUNTS.REWARDS, symbol, limit);
}

/**
 * Get distribution summary by week
 */
export async function getWeeklyDistributionSummary(
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<
  Map<
    string,
    {
      weekId: string;
      totalAmount: number;
      recipientCount: number;
      stakingRewards: number;
      curatorRewards: number;
      contentRewards: number;
    }
  >
> {
  const distributions = await getDistributionHistory(symbol, 1000);
  const summary = new Map<
    string,
    {
      weekId: string;
      totalAmount: number;
      recipientCount: number;
      stakingRewards: number;
      curatorRewards: number;
      contentRewards: number;
    }
  >();

  distributions.forEach((tx) => {
    const date = new Date(tx.timestamp * 1000);
    const weekId = getWeekId(date);
    const amount = parseQuantity(tx.quantity);

    if (!summary.has(weekId)) {
      summary.set(weekId, {
        weekId,
        totalAmount: 0,
        recipientCount: 0,
        stakingRewards: 0,
        curatorRewards: 0,
        contentRewards: 0,
      });
    }

    const week = summary.get(weekId)!;
    week.totalAmount += amount;
    week.recipientCount++;

    if (tx.memo?.includes('Staking reward')) {
      week.stakingRewards += amount;
    } else if (tx.memo?.includes('Curator reward')) {
      week.curatorRewards += amount;
    } else if (tx.memo?.includes('reward')) {
      week.contentRewards += amount;
    }
  });

  return summary;
}

/**
 * Get week ID for a date
 */
function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get account statistics
 */
export async function getAccountStats(
  account: string,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<{
  totalReceived: number;
  totalSent: number;
  transferCount: number;
  uniqueCounterparties: number;
  firstActivity?: Date;
  lastActivity?: Date;
}> {
  const history = await getTransferHistory(account, symbol, 1000);

  if (history.length === 0) {
    return {
      totalReceived: 0,
      totalSent: 0,
      transferCount: 0,
      uniqueCounterparties: 0,
    };
  }

  const counterparties = new Set<string>();
  let totalReceived = 0;
  let totalSent = 0;

  history.forEach((tx) => {
    const amount = parseQuantity(tx.quantity);

    if (tx.to === account) {
      totalReceived += amount;
      counterparties.add(tx.from);
    } else {
      totalSent += amount;
      counterparties.add(tx.to);
    }
  });

  const timestamps = history.map((tx) => tx.timestamp * 1000);

  return {
    totalReceived,
    totalSent,
    transferCount: history.length,
    uniqueCounterparties: counterparties.size,
    firstActivity: new Date(Math.min(...timestamps)),
    lastActivity: new Date(Math.max(...timestamps)),
  };
}
