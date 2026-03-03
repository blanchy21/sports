/**
 * MEDALS Score Calculator
 *
 * Computes a composite reputation score (0-100) using percentile ranks.
 *
 * Score formula:
 *   posts_pctl * 0.25 + engagement_pctl * 0.20 + comments_pctl * 0.15 +
 *   predictions_pctl * 0.15 + streak_pctl * 0.15 + tenure_pctl * 0.10
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';
import { getRankTierForScore } from './catalogue';

// ── Global MEDALS Score ────────────────────────────────────

interface UserScoreRow {
  username: string;
  totalPosts: number;
  totalComments: number;
  totalViewsReceived: number;
  currentPostingStreak: number;
  memberSince: Date;
  predictionTotal: number;
  predictionWins: number;
}

/**
 * Recalculate MEDALS scores for all active users.
 * Called by the weekly cron job.
 */
export async function calculateAllMedalsScores(): Promise<{
  usersProcessed: number;
}> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  try {
    // 1. Fetch all active user stats
    const allStats = await prisma.userStats.findMany({
      where: { lastActiveAt: { gte: sixtyDaysAgo } },
    });
    if (allStats.length === 0) return { usersProcessed: 0 };

    const usernames = allStats.map((s) => s.username);

    // 2. Batch prediction stats
    const predictionMap = await batchPredictionCounts(usernames);

    // 3. Build score rows
    const rows: UserScoreRow[] = allStats.map((s) => ({
      username: s.username,
      totalPosts: s.totalPosts,
      totalComments: s.totalComments,
      totalViewsReceived: s.totalViewsReceived,
      currentPostingStreak: s.currentPostingStreak,
      memberSince: s.memberSince,
      predictionTotal: predictionMap.get(s.username)?.total ?? 0,
      predictionWins: predictionMap.get(s.username)?.wins ?? 0,
    }));

    // 4. Compute percentile ranks for each metric
    const postsPctls = computePercentiles(rows.map((r) => r.totalPosts));
    const engagementPctls = computePercentiles(rows.map((r) => r.totalViewsReceived));
    const commentsPctls = computePercentiles(rows.map((r) => r.totalComments));
    const predictionPctls = computePercentiles(rows.map((r) => r.predictionWins));
    const streakPctls = computePercentiles(rows.map((r) => r.currentPostingStreak));
    const tenurePctls = computePercentiles(
      rows.map((r) => (Date.now() - r.memberSince.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
    );

    // 5. Compute weighted composite and determine rank
    const updates: { username: string; score: number; rank: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const score =
        postsPctls[i] * 0.25 +
        engagementPctls[i] * 0.2 +
        commentsPctls[i] * 0.15 +
        predictionPctls[i] * 0.15 +
        streakPctls[i] * 0.15 +
        tenurePctls[i] * 0.1;

      const roundedScore = Math.round(score * 100) / 100;
      const tier = getRankTierForScore(roundedScore);
      updates.push({ username: rows[i].username, score: roundedScore, rank: tier.rank });
    }

    // 6. Bulk update via raw SQL for efficiency
    if (updates.length > 0) {
      const values = updates.map((u) => `('${u.username}', ${u.score}, '${u.rank}')`).join(', ');

      await prisma.$executeRawUnsafe(`
        UPDATE user_stats SET
          medals_score = v.score,
          medals_rank = v.rank
        FROM (VALUES ${values}) AS v(username, score, rank)
        WHERE user_stats.username = v.username
      `);
    }

    logger.info(`MEDALS scores recalculated for ${updates.length} users`, 'Calculator');
    return { usersProcessed: updates.length };
  } catch (error) {
    logger.error('MEDALS score calculation failed', 'Calculator', error);
    return { usersProcessed: 0 };
  }
}

// ── Per-Sport Scores ───────────────────────────────────────

/**
 * Calculate per-sport MEDALS scores.
 * Aggregates post/sportsbite counts by sport, then computes percentile-based scores.
 */
export async function calculatePerSportScores(): Promise<{
  sportsProcessed: number;
  usersUpdated: number;
}> {
  try {
    // 1. Aggregate post counts by sport and author
    const postsBySport = await prisma.$queryRaw<{ sport: string; username: string; cnt: bigint }[]>`
      SELECT sport_category AS sport, author_username AS username, COUNT(*) AS cnt
      FROM posts
      WHERE sport_category IS NOT NULL AND is_deleted = false
      GROUP BY sport_category, author_username
    `;

    // 2. Aggregate sportsbite counts by sport and author
    const bitesBySport = await prisma.$queryRaw<{ sport: string; username: string; cnt: bigint }[]>`
      SELECT sport_category AS sport, author_username AS username, COUNT(*) AS cnt
      FROM sportsbites
      WHERE sport_category IS NOT NULL AND is_deleted = false
      GROUP BY sport_category, author_username
    `;

    // 3. Merge into per-user-per-sport aggregates
    const aggregates = new Map<string, { posts: number; sportsbites: number }>();
    const key = (u: string, s: string) => `${u}::${s}`;

    for (const row of postsBySport) {
      const k = key(row.username, row.sport);
      const existing = aggregates.get(k) ?? { posts: 0, sportsbites: 0 };
      existing.posts = Number(row.cnt);
      aggregates.set(k, existing);
    }
    for (const row of bitesBySport) {
      const k = key(row.username, row.sport);
      const existing = aggregates.get(k) ?? { posts: 0, sportsbites: 0 };
      existing.sportsbites = Number(row.cnt);
      aggregates.set(k, existing);
    }

    // 4. Group by sport for percentile calculation
    const sportGroups = new Map<string, { username: string; total: number }[]>();
    for (const [k, v] of aggregates) {
      const [username, sport] = k.split('::');
      const total = v.posts + v.sportsbites;
      if (!sportGroups.has(sport)) sportGroups.set(sport, []);
      sportGroups.get(sport)!.push({ username, total });
    }

    // 5. For each sport with ≥5 users, compute percentile scores
    let sportsProcessed = 0;
    let usersUpdated = 0;
    const upserts: {
      username: string;
      sportId: string;
      posts: number;
      sportsbites: number;
      score: number;
      rank: string;
    }[] = [];

    for (const [sport, users] of sportGroups) {
      if (users.length < 5) continue;
      sportsProcessed++;

      const totals = users.map((u) => u.total);
      const pctls = computePercentiles(totals);

      for (let i = 0; i < users.length; i++) {
        const score = Math.round(pctls[i] * 100) / 100;
        const tier = getRankTierForScore(score);
        const agg = aggregates.get(key(users[i].username, sport))!;
        upserts.push({
          username: users[i].username,
          sportId: sport,
          posts: agg.posts,
          sportsbites: agg.sportsbites,
          score,
          rank: tier.rank,
        });
        usersUpdated++;
      }
    }

    // 6. Bulk upsert user_sport_stats
    if (upserts.length > 0) {
      // Batch in chunks of 100 to avoid query size limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < upserts.length; i += CHUNK_SIZE) {
        const chunk = upserts.slice(i, i + CHUNK_SIZE);
        await prisma.$transaction(
          chunk.map((u) =>
            prisma.userSportStats.upsert({
              where: {
                username_sportId: { username: u.username, sportId: u.sportId },
              },
              create: {
                username: u.username,
                sportId: u.sportId,
                posts: u.posts,
                sportsbites: u.sportsbites,
                medalsScore: new Prisma.Decimal(u.score),
                medalsRank: u.rank,
                updatedAt: new Date(),
              },
              update: {
                posts: u.posts,
                sportsbites: u.sportsbites,
                medalsScore: new Prisma.Decimal(u.score),
                medalsRank: u.rank,
                updatedAt: new Date(),
              },
            })
          )
        );
      }
    }

    logger.info(
      `Per-sport scores: ${sportsProcessed} sports, ${usersUpdated} user-sport rows updated`,
      'Calculator'
    );
    return { sportsProcessed, usersUpdated };
  } catch (error) {
    logger.error('Per-sport score calculation failed', 'Calculator', error);
    return { sportsProcessed: 0, usersUpdated: 0 };
  }
}

// ── Utilities ──────────────────────────────────────────────

/**
 * Compute percentile rank (0-100) for each value in an array.
 * Uses "percentage of values below" method.
 */
function computePercentiles(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [50]; // Single user gets median percentile

  // Create indexed array and sort by value
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);

  // Assign percentile ranks (handle ties by averaging)
  const pctls = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    // Find end of tie group
    while (j < n && indexed[j].v === indexed[i].v) j++;
    // Average rank for tie group
    const avgPctl = ((i + j - 1) / 2 / (n - 1)) * 100;
    for (let k = i; k < j; k++) {
      pctls[indexed[k].i] = Math.round(avgPctl * 100) / 100;
    }
    i = j;
  }

  return pctls;
}

/**
 * Batch-fetch prediction win/total counts for a list of usernames.
 */
async function batchPredictionCounts(
  usernames: string[]
): Promise<Map<string, { total: number; wins: number }>> {
  if (usernames.length === 0) return new Map();

  try {
    const rows = await prisma.$queryRaw<{ username: string; total: bigint; wins: bigint }[]>`
      SELECT
        ps.username,
        COUNT(DISTINCT ps.prediction_id) AS total,
        COUNT(DISTINCT CASE WHEN po.is_winner = true THEN ps.prediction_id END) AS wins
      FROM prediction_stakes ps
      JOIN prediction_outcomes po ON po.id = ps.outcome_id
      JOIN predictions p ON p.id = ps.prediction_id AND p.status = 'SETTLED'
      WHERE ps.username = ANY(${usernames})
      GROUP BY ps.username
    `;

    const result = new Map<string, { total: number; wins: number }>();
    for (const row of rows) {
      result.set(row.username, { total: Number(row.total), wins: Number(row.wins) });
    }
    return result;
  } catch (error) {
    logger.error('Failed to batch-query prediction counts', 'Calculator', error);
    return new Map();
  }
}
