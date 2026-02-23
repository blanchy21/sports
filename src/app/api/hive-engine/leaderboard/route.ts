/**
 * MEDALS Token Leaderboard API Route
 *
 * GET /api/hive-engine/leaderboard
 *
 * Returns all MEDALS token holders ranked by total holdings (staked + liquid).
 * Excludes the platform treasury account (sportsblock).
 */

import { NextResponse } from 'next/server';
import { getHiveEngineClient, parseQuantity } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG, CONTRACTS, PREMIUM_TIERS } from '@/lib/hive-engine/constants';
import type { TokenBalance } from '@/lib/hive-engine/types';
import type { PremiumTier } from '@/lib/hive-engine/constants';

export const dynamic = 'force-dynamic';

/** Determine premium tier from staked amount */
function getPremiumTier(staked: number): PremiumTier | null {
  if (staked >= PREMIUM_TIERS.PLATINUM) return 'PLATINUM';
  if (staked >= PREMIUM_TIERS.GOLD) return 'GOLD';
  if (staked >= PREMIUM_TIERS.SILVER) return 'SILVER';
  if (staked >= PREMIUM_TIERS.BRONZE) return 'BRONZE';
  return null;
}

export async function GET() {
  try {
    const client = getHiveEngineClient();

    // Fetch all MEDALS holders (max 1000 — sufficient for current holder count)
    const balances = await client.find<TokenBalance>(
      CONTRACTS.TOKENS,
      'balances',
      { symbol: MEDALS_CONFIG.SYMBOL },
      { limit: 1000, offset: 0 }
    );

    // Parse, exclude treasury, compute totals, and sort
    const holders = balances
      .map((b) => {
        const staked = parseQuantity(b.stake);
        const liquid = parseQuantity(b.balance);
        const delegatedIn = parseQuantity(b.delegationsIn);
        const delegatedOut = parseQuantity(b.delegationsOut);
        const total = liquid + staked + delegatedIn - delegatedOut;

        return {
          account: b.account,
          staked,
          liquid,
          delegatedIn,
          delegatedOut,
          total,
          premiumTier: getPremiumTier(staked),
        };
      })
      .filter(
        (h) =>
          h.account !== MEDALS_CONFIG.ACCOUNTS.MAIN &&
          !MEDALS_CONFIG.ACCOUNTS.FOUNDERS.includes(h.account) &&
          h.total > 0
      )
      .sort((a, b) => b.total - a.total)
      .map((h, i) => ({ rank: i + 1, ...h }));

    return NextResponse.json(
      {
        holders,
        totalHolders: holders.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    );
  } catch (error) {
    console.error('[API] Error fetching MEDALS leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard. Please try again later.' },
      { status: 500 }
    );
  }
}
