import { prisma } from '@/lib/db/prisma';
import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { BADGE_CATALOGUE, RANK_TIERS, getRankTierForScore } from '@/lib/badges/catalogue';
import type { UserBadgeData, UserRankData, UserSportRankData } from '@/lib/badges/types';
import { reconcileStatsFromHive, evaluateBadgesForAction } from '@/lib/badges/evaluator';

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

  // Fetch badges, stats (full row for reconciliation check), sport ranks, monthly titles
  const [userBadges, fullStats, sportStats, monthlyTitles] = await Promise.all([
    prisma.userBadge.findMany({
      where: { username },
      orderBy: { awardedAt: 'desc' },
    }),
    prisma.userStats.findUnique({ where: { username } }),
    prisma.userSportStats.findMany({
      where: { username },
      orderBy: { medalsScore: 'desc' },
    }),
    prisma.monthlyTitle.findMany({
      where: { username },
      orderBy: { awardedAt: 'desc' },
    }),
  ]);

  // If user has stale stats (0 posts + 0 comments), reconcile from Hive and re-evaluate
  // This is fire-and-forget — the current response uses existing data, but next request
  // will reflect the reconciled stats and any newly awarded badges.
  if (fullStats && fullStats.totalPosts === 0 && fullStats.totalComments === 0) {
    reconcileStatsFromHive(username)
      .then((updated) => {
        if (updated) {
          // Re-evaluate all badge triggers after reconciliation
          return evaluateBadgesForAction(username, 'post_created');
        }
      })
      .catch(() => {});
  }

  const userStats = fullStats;

  // Join badge rows with catalogue definitions
  const badges = userBadges
    .map((ub): UserBadgeData | null => {
      const def = BADGE_CATALOGUE.find((b) => b.id === ub.badgeId);
      if (!def) return null;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        ...(def.imageSrc ? { imageSrc: def.imageSrc } : {}),
        shape: def.shape,
        color: def.color,
        glow: def.glow,
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
      monthlyTitles: monthlyTitles.map((t) => ({
        sportId: t.sportId,
        monthId: t.monthId,
        badgeId: t.badgeId,
        score: Number(t.score),
      })),
      stats: { totalBadges: badges.length },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
});
