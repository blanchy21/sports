/**
 * Batch MEDALS Balance API Route
 *
 * GET /api/hive-engine/batch-balance?accounts=user1,user2,user3
 *
 * Returns staked MEDALS balances for multiple accounts in a single request.
 * Optimized for feed pages to reduce N+1 queries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHiveEngineClient, parseQuantity, isValidAccountName } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG, CONTRACTS, CACHE_TTLS, PREMIUM_TIERS } from '@/lib/hive-engine/constants';
import type { TokenBalance } from '@/lib/hive-engine/types';
import type { PremiumTier } from '@/lib/hive-engine/constants';

export const dynamic = 'force-dynamic';

// Maximum accounts per request to prevent abuse
const MAX_ACCOUNTS = 50;

interface BatchBalanceResponse {
  [account: string]: {
    staked: number;
    premiumTier: PremiumTier | null;
  };
}

/**
 * Determine premium tier from staked balance
 */
function getPremiumTierFromStake(staked: number): PremiumTier | null {
  if (staked >= PREMIUM_TIERS.PLATINUM) return 'PLATINUM';
  if (staked >= PREMIUM_TIERS.GOLD) return 'GOLD';
  if (staked >= PREMIUM_TIERS.SILVER) return 'SILVER';
  if (staked >= PREMIUM_TIERS.BRONZE) return 'BRONZE';
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountsParam = searchParams.get('accounts');

    // Validate accounts parameter
    if (!accountsParam) {
      return NextResponse.json(
        { error: 'accounts parameter is required (comma-separated)' },
        { status: 400 }
      );
    }

    // Parse and deduplicate accounts
    const accounts = [
      ...new Set(
        accountsParam
          .split(',')
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid account is required' },
        { status: 400 }
      );
    }

    if (accounts.length > MAX_ACCOUNTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ACCOUNTS} accounts per request` },
        { status: 400 }
      );
    }

    // Validate all account names
    const invalidAccounts = accounts.filter((a) => !isValidAccountName(a));
    if (invalidAccounts.length > 0) {
      return NextResponse.json(
        { error: `Invalid account names: ${invalidAccounts.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch all balances in a single query using $in operator
    const client = getHiveEngineClient();
    const balances = await client.find<TokenBalance>(CONTRACTS.TOKENS, 'balances', {
      account: { $in: accounts },
      symbol: MEDALS_CONFIG.SYMBOL,
    });

    // Build response map with all accounts (including those with no balance)
    const result: BatchBalanceResponse = {};

    // Initialize all accounts with zero
    for (const account of accounts) {
      result[account] = {
        staked: 0,
        premiumTier: null,
      };
    }

    // Fill in actual balances
    for (const balance of balances) {
      const staked = parseQuantity(balance.stake);
      result[balance.account] = {
        staked,
        premiumTier: getPremiumTierFromStake(staked),
      };
    }

    return NextResponse.json(
      {
        success: true,
        balances: result,
        count: accounts.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTLS.BALANCE}, stale-while-revalidate=${CACHE_TTLS.BALANCE * 2}`,
        },
      }
    );
  } catch (error) {
    console.error('[API] Error fetching batch MEDALS balances:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch balances. Please try again later.',
        code: 'BATCH_BALANCE_FETCH_ERROR',
      },
      { status: 500 }
    );
  }
}
