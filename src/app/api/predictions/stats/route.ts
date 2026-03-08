import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import type {
  PredictionUserStats,
  PredictionSportStats,
  PredictionResult,
} from '@/lib/predictions/types';
import { z } from 'zod';

const statsSchema = z.object({
  username: z.string().min(1).max(50),
});

/** A settled prediction outcome for one user (aggregated across their stakes) */
interface SettledPredictionRow {
  prediction_id: string;
  title: string;
  sport_category: string | null;
  settled_at: Date;
  total_staked: Prisma.Decimal;
  total_payout: Prisma.Decimal;
}

/** Per-sport aggregation row */
interface SportStatsRow {
  sport_category: string;
  total: bigint;
  wins: bigint;
}

export const GET = createApiHandler('/api/predictions/stats', async (request, _ctx) => {
  const url = new URL(request.url);
  const { username } = statsSchema.parse({
    username: url.searchParams.get('username'),
  });

  // Fetch settled predictions for this user, grouped by prediction_id.
  // A "win" = total payout > total staked on that prediction.
  // Excludes refunded stakes.
  const settledPredictions = await prisma.$queryRaw<SettledPredictionRow[]>`
    SELECT
      ps.prediction_id,
      p.title,
      p.sport_category,
      p.settled_at,
      SUM(ps.amount) AS total_staked,
      COALESCE(SUM(ps.payout), 0) AS total_payout
    FROM prediction_stakes ps
    JOIN predictions p ON p.id = ps.prediction_id
    WHERE ps.username = ${username}
      AND ps.refund_tx_id IS NULL
      AND p.status = 'SETTLED'
    GROUP BY ps.prediction_id, p.title, p.sport_category, p.settled_at
    ORDER BY p.settled_at DESC
  `;

  // Compute aggregate stats
  let wins = 0;
  let losses = 0;
  let totalStaked = 0;
  let totalWon = 0;

  const outcomes: { won: boolean }[] = [];

  for (const row of settledPredictions) {
    const staked = Number(row.total_staked);
    const payout = Number(row.total_payout);
    const won = payout > staked;

    totalStaked += staked;
    totalWon += payout;

    if (won) {
      wins++;
    } else {
      losses++;
    }

    outcomes.push({ won });
  }

  const totalPredictions = wins + losses;
  const winRate = totalPredictions > 0 ? wins / totalPredictions : 0;
  const profitLoss = totalWon - totalStaked;

  // Compute streaks from outcomes (already sorted by settled_at DESC)
  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < outcomes.length; i++) {
    if (i === 0) {
      currentStreak = outcomes[i].won ? 1 : -1;
      runningStreak = outcomes[i].won ? 1 : 0;
      bestStreak = runningStreak;
    } else {
      // Extend current streak only while consecutive from most recent
      if (i === Math.abs(currentStreak)) {
        if (currentStreak > 0 && outcomes[i].won) {
          currentStreak++;
        } else if (currentStreak < 0 && !outcomes[i].won) {
          currentStreak--;
        }
      }

      // Track best winning streak
      if (outcomes[i].won) {
        runningStreak++;
        if (runningStreak > bestStreak) bestStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    }
  }

  // Per-sport stats
  const sportRows = await prisma.$queryRaw<SportStatsRow[]>`
    SELECT
      p.sport_category,
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
      WHERE username = ${username} AND refund_tx_id IS NULL
      GROUP BY prediction_id, username
    ) sub ON sub.prediction_id = ps.prediction_id AND sub.username = ps.username
    WHERE ps.username = ${username}
      AND ps.refund_tx_id IS NULL
      AND p.status = 'SETTLED'
      AND p.sport_category IS NOT NULL
    GROUP BY p.sport_category
    ORDER BY total DESC
  `;

  const bySport: PredictionSportStats[] = sportRows.map((row) => {
    const total = Number(row.total);
    const sportWins = Number(row.wins);
    return {
      sportCategory: row.sport_category,
      total,
      wins: sportWins,
      winRate: total > 0 ? sportWins / total : 0,
    };
  });

  // Recent results (last 10)
  const recentResults: PredictionResult[] = settledPredictions.slice(0, 10).map((row) => ({
    predictionId: row.prediction_id,
    title: row.title,
    sportCategory: row.sport_category,
    won: Number(row.total_payout) > Number(row.total_staked),
    staked: Number(row.total_staked),
    payout: Number(row.total_payout),
    settledAt: row.settled_at.toISOString(),
  }));

  const stats: PredictionUserStats = {
    username,
    totalPredictions,
    wins,
    losses,
    winRate,
    currentStreak,
    bestStreak,
    totalStaked,
    totalWon,
    profitLoss,
    bySport,
    recentResults,
  };

  return apiSuccess(stats);
});
