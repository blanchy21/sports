import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { prisma } from '@/lib/db/prisma';
import { getRankTierForScore, RANK_TIERS } from '@/lib/badges/catalogue';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { incrementUserStat } from '@/lib/metrics/user-stats';
import { evaluateBadgesForAction } from '@/lib/badges/evaluator';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const querySchema = z.object({
  username: z.string().min(1).max(50),
});

export const GET = createApiHandler('/api/user-stats', async (request, ctx) => {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ username: url.searchParams.get('username') });
  if (!parsed.success) {
    return apiError('username query parameter is required', 'VALIDATION_ERROR', 400);
  }
  const { username } = parsed.data;

  // Fetch full UserStats + sport ranks in parallel
  const [stats, sportStats, predictionRows] = await Promise.all([
    prisma.userStats.findUnique({ where: { username } }),
    prisma.userSportStats.findMany({
      where: { username },
      orderBy: { medalsScore: 'desc' },
    }),
    // Prediction summary (wins/total) using same settled-prediction logic as predictions/stats
    prisma.$queryRaw<{ total: bigint; wins: bigint }[]>`
      SELECT
        COUNT(DISTINCT ps.prediction_id) AS total,
        COUNT(DISTINCT CASE
          WHEN sub.total_payout > sub.total_staked THEN ps.prediction_id
        END) AS wins
      FROM prediction_stakes ps
      JOIN predictions p ON p.id = ps.prediction_id
      JOIN (
        SELECT
          prediction_id,
          username,
          SUM(amount) AS total_staked,
          COALESCE(SUM(payout), 0) AS total_payout
        FROM prediction_stakes
        WHERE username = ${username} AND refund_tx_id IS NULL AND payout IS NOT NULL
        GROUP BY prediction_id, username
      ) sub ON sub.prediction_id = ps.prediction_id AND sub.username = ps.username
      WHERE ps.username = ${username}
        AND ps.refund_tx_id IS NULL
        AND p.status = 'SETTLED'
    `,
  ]);

  if (!stats) {
    return apiError('User stats not found', 'NOT_FOUND', 404);
  }

  const total = Number(predictionRows[0]?.total ?? 0);
  const wins = Number(predictionRows[0]?.wins ?? 0);
  const winRate = total > 0 ? wins / total : 0;

  // Build sport ranks with tier info
  const sportRanks = sportStats
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

  ctx.log.info('User stats fetched', { username });

  return apiSuccess(
    {
      stats: {
        username: stats.username,
        totalPosts: stats.totalPosts,
        totalSportsbites: stats.totalSportsbites,
        totalComments: stats.totalComments,
        totalViewsReceived: stats.totalViewsReceived,
        totalTipsReceived: Number(stats.totalTipsReceived),
        totalMedalsEarned: Number(stats.totalMedalsEarned),
        memberSince: stats.memberSince.toISOString(),
        lastActiveAt: stats.lastActiveAt.toISOString(),
        currentPostingStreak: stats.currentPostingStreak,
        longestPostingStreak: stats.longestPostingStreak,
        medalsScore: Number(stats.medalsScore),
        medalsRank: stats.medalsRank,
      },
      predictions: { total, wins, winRate },
      sportRanks,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
});

// ── POST /api/user-stats — Track stat increment (e.g. sportsbite posted via Hive) ──

const trackSchema = z.object({
  action: z.enum(['sportsbite_created']),
});

export const POST = createApiHandler('/api/user-stats', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return apiError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid action', 'VALIDATION_ERROR', 400);
    }

    const { action } = parsed.data;

    if (action === 'sportsbite_created') {
      incrementUserStat(user.username, 'totalSportsbites');
      evaluateBadgesForAction(user.username, 'sportsbite_created').catch((err) =>
        logger.error('Badge evaluation failed', 'badges', err)
      );
      ctx.log.info('Tracked sportsbite creation', { username: user.username });
    }

    return apiSuccess({ tracked: true });
  });
});
