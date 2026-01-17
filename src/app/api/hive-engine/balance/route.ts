/**
 * MEDALS Balance API Route
 *
 * GET /api/hive-engine/balance?account=username
 *
 * Returns the MEDALS token balance for a user including:
 * - Liquid balance
 * - Staked balance
 * - Pending unstake
 * - Delegations
 * - Premium tier status
 * - Estimated APY
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMedalsBalance,
  getStakeInfo,
  calculateEstimatedAPY,
} from '@/lib/hive-engine/tokens';
import { getMarketData } from '@/lib/hive-engine/market';
import { formatQuantity, isValidAccountName } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG, CACHE_TTLS } from '@/lib/hive-engine/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account');

    // Validate account parameter
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

    // Fetch balance and market data in parallel
    const [balance, stakeInfo, marketData] = await Promise.all([
      getMedalsBalance(account),
      getStakeInfo(account),
      getMarketData(MEDALS_CONFIG.SYMBOL),
    ]);

    // Handle case where user has no MEDALS
    if (!balance) {
      return NextResponse.json(
        {
          account,
          symbol: MEDALS_CONFIG.SYMBOL,
          liquid: '0.000',
          staked: '0.000',
          pendingUnstake: '0.000',
          delegatedIn: '0.000',
          delegatedOut: '0.000',
          total: '0.000',
          estimatedAPY: '0.00',
          premiumTier: null,
          hiveValue: '0.000',
          cached: false,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_TTLS.BALANCE}, stale-while-revalidate=${CACHE_TTLS.BALANCE * 2}`,
          },
        }
      );
    }

    // Calculate HIVE value
    const hiveValue = marketData
      ? balance.total * marketData.priceHive
      : 0;

    const response = {
      account,
      symbol: MEDALS_CONFIG.SYMBOL,
      liquid: formatQuantity(balance.liquid),
      staked: formatQuantity(balance.staked),
      pendingUnstake: formatQuantity(balance.pendingUnstake),
      delegatedIn: formatQuantity(balance.delegatedIn),
      delegatedOut: formatQuantity(balance.delegatedOut),
      total: formatQuantity(balance.total),
      estimatedAPY: stakeInfo?.estimatedAPY.toFixed(2) || '0.00',
      premiumTier: balance.premiumTier,
      hiveValue: formatQuantity(hiveValue),
      unstakingCompleteTimestamp: stakeInfo?.unstakingCompleteTimestamp || null,
      cached: false,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_TTLS.BALANCE}, stale-while-revalidate=${CACHE_TTLS.BALANCE * 2}`,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching MEDALS balance:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch balance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
