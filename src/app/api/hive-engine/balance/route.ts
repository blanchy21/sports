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

import { NextResponse } from 'next/server';
import { getMedalsBalance, getStakeInfo } from '@/lib/hive-engine/tokens';
import { getMarketData } from '@/lib/hive-engine/market';
import { formatQuantity, isValidAccountName } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG, CACHE_TTLS } from '@/lib/hive-engine/constants';
import { createApiHandler, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = createApiHandler('/api/hive-engine/balance', async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account');

  // Validate account parameter
  if (!account) {
    return apiError('Account parameter is required', 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
  }

  if (!isValidAccountName(account)) {
    return apiError('Invalid account name', 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
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
        liquid: '0.000000',
        staked: '0.000000',
        pendingUnstake: '0.000000',
        delegatedIn: '0.000000',
        delegatedOut: '0.000000',
        total: '0.000000',
        estimatedAPY: '0.00',
        premiumTier: null,
        hiveValue: '0.000000',
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
  const hiveValue = marketData ? balance.total * marketData.priceHive : 0;

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
});
