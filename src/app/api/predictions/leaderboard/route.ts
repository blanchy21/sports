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

/** Per-prediction outcome for streak calculation */
interface StreakRow {
  username: string;
  prediction_id: string;
  settled_at: Date;
  total_staked: Prisma.Decimal;
  total_payout: Prisma.Decimal;
}

function computeCurrentStreak(rows: StreakRow[]): number {
  if (rows.length === 0) return 0;

  const firstWon = Number(rows[0].total_payout) > Number(rows[0].total_staked);
  let streak = firstWon ? 1 : -1;

  for (let i = 1; i < rows.length; i++) {
    const won = Number(rows[i].total_payout) > Number(rows[i].total_staked);
    if (firstWon && won) {
      streak++;
    } else if (!firstWon && !won) {
      streak--;
    } else {
      break;
    }
  }

  return streak;
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
      // Will sort in application code after computing streaks
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
      COUNT(CASE WHEN ps.payout IS NULL OR ps.payout <= ps.amount THEN 1 END) AS losses,
      COALESCE(SUM(ps.amount), 0) AS total_staked,
      COALESCE(SUM(CASE WHEN ps.payout > 0 THEN ps.payout ELSE 0 END), 0) AS total_won,
      COALESCE(SUM(COALESCE(ps.payout, 0) - ps.amount), 0) AS profit_loss
    FROM prediction_stakes ps
    JOIN predictions p ON p.id = ps.prediction_id
    WHERE ps.refund_tx_id IS NULL
    AND p.status = 'SETTLED'
    ${periodFilter}
    GROUP BY ps.username
    HAVING COUNT(DISTINCT ps.prediction_id) >= 3
    ORDER BY ${orderBy}
    LIMIT ${params.limit}
  `;

  // Compute streaks for all returned users
  const usernames = rows.map((r) => r.username);
  let streakMap = new Map<string, number>();

  if (usernames.length > 0) {
    const streakRows = await prisma.$queryRaw<StreakRow[]>`
      SELECT
        ps.username,
        ps.prediction_id,
        p.settled_at,
        SUM(ps.amount) AS total_staked,
        COALESCE(SUM(ps.payout), 0) AS total_payout
      FROM prediction_stakes ps
      JOIN predictions p ON p.id = ps.prediction_id
      WHERE ps.username IN (${Prisma.join(usernames)})
        AND ps.refund_tx_id IS NULL
        AND p.status = 'SETTLED'
      GROUP BY ps.username, ps.prediction_id, p.settled_at
      ORDER BY ps.username, p.settled_at DESC
    `;

    // Group by username and compute streaks
    const grouped = new Map<string, StreakRow[]>();
    for (const row of streakRows) {
      const existing = grouped.get(row.username) || [];
      existing.push(row);
      grouped.set(row.username, existing);
    }

    streakMap = new Map(
      Array.from(grouped.entries()).map(([username, userRows]) => [
        username,
        computeCurrentStreak(userRows),
      ])
    );
  }

  let leaderboard: PredictionLeaderboardEntry[] = rows.map((row) => {
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
      currentStreak: streakMap.get(row.username) ?? 0,
    };
  });

  // For streak sort, re-sort by actual streak (descending by winning streak)
  if (params.sort === 'streak') {
    leaderboard = leaderboard.sort((a, b) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0));
  }

  return apiSuccess({ leaderboard });
});
