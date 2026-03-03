import { prisma } from '@/lib/db/prisma';
import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { BADGE_CATALOGUE, RANK_TIERS, getRankTierForScore } from '@/lib/badges/catalogue';
import type { UserBadgeData, UserRankData, UserSportRankData } from '@/lib/badges/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler('/api/badges', async (request) => {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return apiSuccess(
      { badges: [], rank: null, sportRanks: [], stats: { totalBadges: 0 } },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  }

  // Fetch badges, stats, and sport ranks in parallel
  const [userBadges, userStats, sportStats] = await Promise.all([
    prisma.userBadge.findMany({
      where: { username },
      orderBy: { awardedAt: 'desc' },
    }),
    prisma.userStats.findUnique({
      where: { username },
      select: { medalsScore: true, medalsRank: true },
    }),
    prisma.userSportStats.findMany({
      where: { username },
      orderBy: { medalsScore: 'desc' },
    }),
  ]);

  // Join badge rows with catalogue definitions
  const badges: UserBadgeData[] = userBadges
    .map((ub) => {
      const def = BADGE_CATALOGUE.find((b) => b.id === ub.badgeId);
      if (!def) return null;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        bgGradient: def.bgGradient,
        textColor: def.textColor,
        glowColor: def.glowColor,
        awardedAt: ub.awardedAt.toISOString(),
      };
    })
    .filter((b): b is UserBadgeData => b !== null);

  // Build rank data
  let rank: UserRankData | null = null;
  if (userStats?.medalsRank) {
    const score = Number(userStats.medalsScore);
    const tier = getRankTierForScore(score);
    rank = {
      score,
      label: tier.label,
      rank: tier.rank,
      bgGradient: tier.bgGradient,
      textColor: tier.textColor,
    };
  }

  // Build sport ranks
  const sportRanks: UserSportRankData[] = sportStats
    .filter((s) => s.medalsRank)
    .map((s) => {
      const score = Number(s.medalsScore);
      const tier = RANK_TIERS.find((t) => t.rank === s.medalsRank) ?? getRankTierForScore(score);
      return {
        sportId: s.sportId,
        score,
        label: tier.label,
        rank: tier.rank,
      };
    });

  return apiSuccess(
    {
      badges,
      rank,
      sportRanks,
      stats: { totalBadges: badges.length },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
});
