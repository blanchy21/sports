/**
 * MEDALS Transaction History API Route
 *
 * GET /api/hive-engine/history?account=username&type=all&limit=50&offset=0
 *
 * Query parameters:
 *   - account: Required - Hive account name
 *   - type: Optional - "all" | "transfers" | "staking" | "rewards" (default: "all")
 *   - limit: Optional - Number of results (default: 50, max: 100)
 *   - offset: Optional - Pagination offset (default: 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTransferHistory,
  getStakingHistory,
  getRewardsReceived,
  getRecentActivity,
  getAccountStats,
} from '@/lib/hive-engine/history';
import { isValidAccountName, parseQuantity } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG, CACHE_TTLS } from '@/lib/hive-engine/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account');
    const type = searchParams.get('type') || 'all';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate account
    if (!account) {
      return NextResponse.json(
        { error: 'Account parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidAccountName(account)) {
      return NextResponse.json(
        { error: 'Invalid account name' },
        { status: 400 }
      );
    }

    // Parse and validate limit/offset
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10), 1), 100);
    const offset = Math.max(parseInt(offsetParam || '0', 10), 0);

    // Validate type
    const validTypes = ['all', 'transfers', 'staking', 'rewards', 'activity'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Use: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    let response;

    switch (type) {
      case 'transfers': {
        const transfers = await getTransferHistory(account, MEDALS_CONFIG.SYMBOL, limit, offset);

        response = {
          account,
          type: 'transfers',
          symbol: MEDALS_CONFIG.SYMBOL,
          count: transfers.length,
          limit,
          offset,
          transactions: transfers.map((tx) => ({
            from: tx.from,
            to: tx.to,
            quantity: tx.quantity,
            memo: tx.memo || null,
            timestamp: new Date(tx.timestamp * 1000).toISOString(),
            direction: tx.to === account ? 'in' : 'out',
          })),
        };
        break;
      }

      case 'staking': {
        const stakingActions = await getStakingHistory(account, MEDALS_CONFIG.SYMBOL, limit);

        response = {
          account,
          type: 'staking',
          symbol: MEDALS_CONFIG.SYMBOL,
          count: stakingActions.length,
          limit,
          offset,
          transactions: stakingActions.map((action) => ({
            action: action.action,
            quantity: action.quantity,
            to: action.to || null,
            from: action.from || null,
            timestamp: new Date(action.timestamp * 1000).toISOString(),
          })),
        };
        break;
      }

      case 'rewards': {
        const rewards = await getRewardsReceived(account, MEDALS_CONFIG.SYMBOL, limit);

        const rewardsByType = {
          staking: 0,
          curator: 0,
          content: 0,
          other: 0,
        };

        rewards.forEach((r) => {
          rewardsByType[r.type] += r.amount;
        });

        response = {
          account,
          type: 'rewards',
          symbol: MEDALS_CONFIG.SYMBOL,
          count: rewards.length,
          limit,
          offset,
          summary: {
            staking: rewardsByType.staking.toFixed(3),
            curator: rewardsByType.curator.toFixed(3),
            content: rewardsByType.content.toFixed(3),
            other: rewardsByType.other.toFixed(3),
            total: (
              rewardsByType.staking +
              rewardsByType.curator +
              rewardsByType.content +
              rewardsByType.other
            ).toFixed(3),
          },
          transactions: rewards.slice(offset, offset + limit).map((r) => ({
            type: r.type,
            amount: r.amount.toFixed(3),
            from: r.from,
            memo: r.memo || null,
            timestamp: r.timestamp.toISOString(),
          })),
        };
        break;
      }

      case 'activity': {
        const activity = await getRecentActivity(account, MEDALS_CONFIG.SYMBOL, limit);

        response = {
          account,
          type: 'activity',
          symbol: MEDALS_CONFIG.SYMBOL,
          count: activity.length,
          limit,
          offset,
          transactions: activity.map((a) => ({
            type: a.type,
            amount: a.amount.toFixed(3),
            counterparty: a.counterparty || null,
            memo: a.memo || null,
            timestamp: a.timestamp.toISOString(),
          })),
        };
        break;
      }

      case 'all':
      default: {
        // Get all types and stats
        const [transfers, stakingActions, rewards, stats] = await Promise.all([
          getTransferHistory(account, MEDALS_CONFIG.SYMBOL, Math.ceil(limit / 3), 0),
          getStakingHistory(account, MEDALS_CONFIG.SYMBOL, Math.ceil(limit / 3)),
          getRewardsReceived(account, MEDALS_CONFIG.SYMBOL, Math.ceil(limit / 3)),
          getAccountStats(account, MEDALS_CONFIG.SYMBOL),
        ]);

        response = {
          account,
          type: 'all',
          symbol: MEDALS_CONFIG.SYMBOL,
          stats: {
            totalReceived: stats.totalReceived.toFixed(3),
            totalSent: stats.totalSent.toFixed(3),
            transferCount: stats.transferCount,
            uniqueCounterparties: stats.uniqueCounterparties,
            firstActivity: stats.firstActivity?.toISOString() || null,
            lastActivity: stats.lastActivity?.toISOString() || null,
          },
          recentTransfers: transfers.slice(0, 10).map((tx) => ({
            from: tx.from,
            to: tx.to,
            quantity: tx.quantity,
            memo: tx.memo || null,
            timestamp: new Date(tx.timestamp * 1000).toISOString(),
            direction: tx.to === account ? 'in' : 'out',
          })),
          recentStaking: stakingActions.slice(0, 10).map((action) => ({
            action: action.action,
            quantity: action.quantity,
            timestamp: new Date(action.timestamp * 1000).toISOString(),
          })),
          recentRewards: rewards.slice(0, 10).map((r) => ({
            type: r.type,
            amount: r.amount.toFixed(3),
            timestamp: r.timestamp.toISOString(),
          })),
        };
        break;
      }
    }

    return NextResponse.json(
      {
        ...response,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTLS.HISTORY}, stale-while-revalidate=${CACHE_TTLS.HISTORY * 2}`,
        },
      }
    );
  } catch (error) {
    console.error('[API] Error fetching history:', error);
    // Sanitize error response - don't expose internal details
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transaction history. Please try again later.',
        code: 'HISTORY_FETCH_ERROR',
      },
      { status: 500 }
    );
  }
}
