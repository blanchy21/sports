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
import { createApiHandler } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import type { TokenBalance } from '@/lib/hive-engine/types';
import type { PremiumTier } from '@/lib/hive-engine/constants';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive-engine/leaderboard';

/** Determine premium tier from staked amount */
function getPremiumTier(staked: number): PremiumTier | null {
  if (staked >= PREMIUM_TIERS.PLATINUM) return 'PLATINUM';
  if (staked >= PREMIUM_TIERS.GOLD) return 'GOLD';
  if (staked >= PREMIUM_TIERS.SILVER) return 'SILVER';
  if (staked >= PREMIUM_TIERS.BRONZE) return 'BRONZE';
  return null;
}

/** Fetch the most recent completed staking distribution from the DB */
async function getLatestDistribution() {
  try {
    const record = await prisma.analyticsEvent.findFirst({
      where: {
        eventType: { startsWith: 'staking-' },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return null;

    const metadata = record.metadata as Record<string, unknown>;
    const distributions =
      (metadata.topDistributions as Array<{
        account: string;
        amount: number;
        percentage: number;
      }>) || [];

    return {
      weekId: metadata.weekId as string,
      apr: metadata.apr as number,
      totalStaked: metadata.totalStaked as number,
      totalDistributed: metadata.totalDistributed as number,
      eligibleStakerCount: metadata.eligibleStakerCount as number,
      status: metadata.status as string,
      distributedAt: metadata.createdAt as string,
      distributions,
    };
  } catch (err) {
    logger.error('Failed to fetch latest distribution', ROUTE, err);
    return null;
  }
}

export const GET = createApiHandler(ROUTE, async () => {
  const client = getHiveEngineClient();

  // Fetch holders and latest distribution in parallel
  const [balances, latestDistribution] = await Promise.all([
    client.find<TokenBalance>(
      CONTRACTS.TOKENS,
      'balances',
      { symbol: MEDALS_CONFIG.SYMBOL },
      { limit: 1000, offset: 0 }
    ),
    getLatestDistribution(),
  ]);

  // Build a lookup of last reward by account
  const lastRewardMap = new Map<string, number>();
  if (latestDistribution) {
    for (const d of latestDistribution.distributions) {
      lastRewardMap.set(d.account, d.amount);
    }
  }

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
        lastReward: lastRewardMap.get(b.account) ?? null,
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
      latestDistribution: latestDistribution
        ? {
            weekId: latestDistribution.weekId,
            apr: latestDistribution.apr,
            totalStaked: latestDistribution.totalStaked,
            totalDistributed: latestDistribution.totalDistributed,
            eligibleStakerCount: latestDistribution.eligibleStakerCount,
            status: latestDistribution.status,
            distributedAt: latestDistribution.distributedAt,
          }
        : null,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      },
    }
  );
});
