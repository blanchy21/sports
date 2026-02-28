import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import type { PredictionLeaderboardEntry } from '@/lib/predictions/types';
import { z } from 'zod';

const leaderboardSchema = z.object({
  sort: z.enum(['profit', 'winrate', 'streak']).default('profit'),
  period: z.enum(['week', 'month', 'alltime']).default('alltime'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

interface RawLeaderboardRow {
  username: string;
  total_predictions: bigint;
  wins: bigint;
  losses: bigint;
  total_staked: Prisma.Decimal;
  total_won: Prisma.Decimal;
  profit_loss: Prisma.Decimal;
}

export const GET = createApiHandler('/api/predictions/leaderboard', async (request, _ctx) => {
  const url = new URL(request.url);
  const params = leaderboardSchema.parse({
    sort: url.searchParams.get('sort') ?? undefined,
    period: url.searchParams.get('period') ?? undefined,
    limit: url.searchParams.get('limit') ?? 20,
  });

  let periodFilter = Prisma.sql``;
  if (params.period === 'week') {
    periodFilter = Prisma.sql`AND ps.created_at > NOW() - INTERVAL '7 days'`;
  } else if (params.period === 'month') {
    periodFilter = Prisma.sql`AND ps.created_at > NOW() - INTERVAL '30 days'`;
  }

  // Safe: params.sort is Zod-validated to the enum ['profit','winrate','streak'],
  // so this switch cannot produce arbitrary SQL.
  let orderBy: Prisma.Sql;
  switch (params.sort) {
    case 'winrate':
      orderBy = Prisma.sql`(COUNT(CASE WHEN ps.payout > 0 AND ps.payout > ps.amount THEN 1 END)::FLOAT / NULLIF(COUNT(CASE WHEN ps.payout > 0 AND ps.payout > ps.amount THEN 1 END) + COUNT(CASE WHEN ps.payout IS NOT NULL AND (ps.payout = 0 OR ps.payout <= ps.amount) THEN 1 END), 0)) DESC NULLS LAST`;
      break;
    case 'streak':
      orderBy = Prisma.sql`profit_loss DESC`;
      break;
    default:
      orderBy = Prisma.sql`profit_loss DESC`;
  }

  const rows = await prisma.$queryRaw<RawLeaderboardRow[]>`
    SELECT
      ps.username,
      COUNT(DISTINCT ps.prediction_id) AS total_predictions,
      COUNT(CASE WHEN ps.payout > 0 AND ps.payout > ps.amount THEN 1 END) AS wins,
      COUNT(CASE WHEN ps.payout IS NOT NULL AND (ps.payout = 0 OR ps.payout <= ps.amount) THEN 1 END) AS losses,
      COALESCE(SUM(ps.amount), 0) AS total_staked,
      COALESCE(SUM(CASE WHEN ps.payout > 0 THEN ps.payout ELSE 0 END), 0) AS total_won,
      COALESCE(SUM(CASE WHEN ps.payout IS NOT NULL THEN ps.payout - ps.amount ELSE 0 END), 0) AS profit_loss
    FROM prediction_stakes ps
    WHERE ps.refunded = false
    ${periodFilter}
    GROUP BY ps.username
    HAVING COUNT(DISTINCT ps.prediction_id) >= 3
    ORDER BY ${orderBy}
    LIMIT ${params.limit}
  `;

  const leaderboard: PredictionLeaderboardEntry[] = rows.map((row) => {
    const wins = Number(row.wins);
    const losses = Number(row.losses);
    const total = wins + losses;

    return {
      username: row.username,
      totalPredictions: Number(row.total_predictions),
      wins,
      losses,
      totalStaked: Number(row.total_staked),
      totalWon: Number(row.total_won),
      profitLoss: Number(row.profit_loss),
      winRate: total > 0 ? wins / total : 0,
    };
  });

  return apiSuccess({ leaderboard });
});
