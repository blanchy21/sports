/**
 * Badge Evaluator
 *
 * - evaluateBadgesForAction(): Inline evaluation after specific user actions (fire-and-forget)
 * - evaluateAllBadges(): Batch cron sweep for all active users
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { BADGE_CATALOGUE } from './catalogue';
import type { BadgeTrigger, BadgeDefinition } from './types';
import { getAccountOptimized } from '@/lib/hive-workerbee/optimization';

// ── Inline evaluation (after user action) ──────────────────

/**
 * Evaluate badges triggered by a specific user action.
 * Fire-and-forget — errors are logged, never thrown.
 * Returns IDs of newly awarded badges.
 */
export async function evaluateBadgesForAction(
  username: string,
  trigger: BadgeTrigger
): Promise<string[]> {
  try {
    // 1. Get user's existing badge IDs
    const existingBadges = await prisma.userBadge.findMany({
      where: { username },
      select: { badgeId: true },
    });
    const earnedSet = new Set(existingBadges.map((b) => b.badgeId));

    // 2. Filter catalogue to badges with matching trigger that aren't already earned
    const candidates = BADGE_CATALOGUE.filter(
      (b) => b.triggers.includes(trigger) && !earnedSet.has(b.id)
    );
    if (candidates.length === 0) return [];

    // 3. Fetch user stats
    const stats = await prisma.userStats.findUnique({ where: { username } });
    if (!stats) return [];

    // 4. Fetch prediction stats if any candidates need them
    const needsPredictions = candidates.some((b) => b.metric.startsWith('predictions.'));
    const pStats = needsPredictions
      ? ((await batchPredictionStats([username])).get(username) ?? null)
      : null;

    // 5. Evaluate each candidate
    const newBadgeIds: string[] = [];
    for (const badge of candidates) {
      const value = resolveMetricValue(badge, stats, pStats);
      if (value === null) continue;

      if (badge.minSample !== undefined) {
        const sample = resolveSampleSize(badge, stats, pStats);
        if (sample !== null && sample < badge.minSample) continue;
      }

      if (value >= badge.threshold) {
        newBadgeIds.push(badge.id);
      }
    }

    if (newBadgeIds.length === 0) return [];

    // 6. Bulk insert (ON CONFLICT DO NOTHING via createMany skipDuplicates)
    await prisma.userBadge.createMany({
      data: newBadgeIds.map((badgeId) => ({ username, badgeId })),
      skipDuplicates: true,
    });

    // 7. Create notifications for new badges
    await createBadgeNotifications(username, newBadgeIds);

    logger.info(`Awarded ${newBadgeIds.length} badge(s) to ${username}`, 'Badges', {
      badges: newBadgeIds,
      trigger,
    });

    return newBadgeIds;
  } catch (error) {
    logger.error(`Badge evaluation failed for ${username}`, 'Badges', error);
    return [];
  }
}

// ── Batch evaluation (weekly cron) ─────────────────────────

/**
 * Evaluate all badges for all users active in the last 30 days.
 * Called by the weekly cron job.
 */
export async function evaluateAllBadges(): Promise<{
  usersProcessed: number;
  badgesAwarded: number;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // 1. Fetch all active UserStats rows
    const BATCH_LIMIT = 10_000;
    const allStats = await prisma.userStats.findMany({
      where: { lastActiveAt: { gte: thirtyDaysAgo } },
      take: BATCH_LIMIT,
    });
    if (allStats.length === BATCH_LIMIT) {
      logger.warn(`Badge evaluation hit ${BATCH_LIMIT} user limit — pagination needed`, 'Badges');
    }
    if (allStats.length === 0) return { usersProcessed: 0, badgesAwarded: 0 };

    const usernames = allStats.map((s) => s.username);

    // 1b. Reconcile stats from Hive for users with 0 posts (likely untracked on-chain activity)
    const staleUsers = allStats.filter((s) => s.totalPosts === 0 && s.totalComments === 0);
    if (staleUsers.length > 0) {
      const RECONCILE_BATCH = 50; // Limit Hive API calls per sweep
      const toReconcile = staleUsers.slice(0, RECONCILE_BATCH);
      let reconciled = 0;
      for (const user of toReconcile) {
        const updated = await reconcileStatsFromHive(user.username);
        if (updated) reconciled++;
      }
      if (reconciled > 0) {
        logger.info(`Reconciled ${reconciled}/${toReconcile.length} users from Hive`, 'Badges');
        // Re-fetch stats for reconciled users so badge evaluation uses updated values
        const refreshed = await prisma.userStats.findMany({
          where: { username: { in: toReconcile.map((u) => u.username) } },
        });
        for (const fresh of refreshed) {
          const idx = allStats.findIndex((s) => s.username === fresh.username);
          if (idx >= 0) allStats[idx] = fresh;
        }
      }
    }

    // 2. Fetch all existing badges for these users
    const existingBadges = await prisma.userBadge.findMany({
      where: { username: { in: usernames } },
      select: { username: true, badgeId: true },
    });
    const earnedMap = new Map<string, Set<string>>();
    for (const b of existingBadges) {
      if (!earnedMap.has(b.username)) earnedMap.set(b.username, new Set());
      earnedMap.get(b.username)!.add(b.badgeId);
    }

    // 3. Batch-query prediction stats for all active users
    const predictionStats = await batchPredictionStats(usernames);

    // 4. Evaluate badges per user
    let totalAwarded = 0;
    const toInsert: { username: string; badgeId: string }[] = [];
    const notifications: { username: string; badgeIds: string[] }[] = [];

    for (const stats of allStats) {
      const earned = earnedMap.get(stats.username) ?? new Set();
      const pStats = predictionStats.get(stats.username);
      const newBadgeIds: string[] = [];

      for (const badge of BADGE_CATALOGUE) {
        if (earned.has(badge.id)) continue;

        const value = resolveMetricValue(badge, stats, pStats ?? null);
        if (value === null) continue;

        if (badge.minSample !== undefined) {
          const sample = resolveSampleSize(badge, stats, pStats ?? null);
          if (sample !== null && sample < badge.minSample) continue;
        }

        if (value >= badge.threshold) {
          newBadgeIds.push(badge.id);
        }
      }

      if (newBadgeIds.length > 0) {
        for (const badgeId of newBadgeIds) {
          toInsert.push({ username: stats.username, badgeId });
        }
        notifications.push({ username: stats.username, badgeIds: newBadgeIds });
        totalAwarded += newBadgeIds.length;
      }
    }

    // 5. Bulk insert all new badges
    if (toInsert.length > 0) {
      await prisma.userBadge.createMany({ data: toInsert, skipDuplicates: true });
    }

    // 6. Create notifications (batched per user)
    for (const { username, badgeIds } of notifications) {
      await createBadgeNotifications(username, badgeIds).catch(() => {});
    }

    logger.info(
      `Badge sweep: ${allStats.length} users processed, ${totalAwarded} badges awarded`,
      'Badges'
    );

    return { usersProcessed: allStats.length, badgesAwarded: totalAwarded };
  } catch (error) {
    logger.error('Badge sweep failed', 'Badges', error);
    return { usersProcessed: 0, badgesAwarded: 0 };
  }
}

// ── Helpers ────────────────────────────────────────────────

interface PredictionStatsRow {
  total: number;
  wins: number;
  winRate: number;
  bestStreak: number;
}

/**
 * Batch-fetch prediction stats for a list of usernames using raw SQL.
 */
async function batchPredictionStats(usernames: string[]): Promise<Map<string, PredictionStatsRow>> {
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

    const result = new Map<string, PredictionStatsRow>();
    for (const row of rows) {
      const total = Number(row.total);
      const wins = Number(row.wins);
      result.set(row.username, {
        total,
        wins,
        winRate: total > 0 ? wins / total : 0,
        bestStreak: 0, // Streak calculation requires ordered data; kept simple for now
      });
    }
    return result;
  } catch (error) {
    logger.error('Failed to batch-query prediction stats', 'Badges', error);
    return new Map();
  }
}

/**
 * Resolve a badge's metric value from user stats + prediction stats.
 */
function resolveMetricValue(
  badge: BadgeDefinition,
  stats: {
    totalPosts: number;
    totalSportsbites: number;
    totalComments: number;
    totalViewsReceived: number;
    totalMedalsEarned: { toNumber(): number } | number;
    currentPostingStreak: number;
    longestPostingStreak: number;
    memberSince: Date;
  },
  pStats: PredictionStatsRow | null
): number | null {
  switch (badge.metric) {
    case 'totalPosts':
      return stats.totalPosts;
    case 'totalSportsbites':
      return stats.totalSportsbites;
    case 'totalComments':
      return stats.totalComments;
    case 'totalViewsReceived':
      return stats.totalViewsReceived;
    case 'totalMedalsEarned': {
      const v = stats.totalMedalsEarned;
      return typeof v === 'number' ? v : v.toNumber();
    }
    case 'currentPostingStreak':
      return stats.currentPostingStreak;
    case 'longestPostingStreak':
      return stats.longestPostingStreak;
    case 'tenure_months': {
      const diffMs = Date.now() - stats.memberSince.getTime();
      return diffMs / (30.44 * 24 * 60 * 60 * 1000); // average month
    }
    case 'pre_launch': {
      // OG Member: joined before end of April 2026
      const LAUNCH_DATE = new Date('2026-04-30T23:59:59Z');
      return stats.memberSince < LAUNCH_DATE ? 1 : 0;
    }
    case 'predictions.total':
      return pStats?.total ?? 0;
    case 'predictions.winRate':
      return pStats?.winRate ?? 0;
    case 'predictions.bestStreak':
      return pStats?.bestStreak ?? 0;
    default:
      return null;
  }
}

/**
 * Resolve sample size for rate-based metrics.
 */
function resolveSampleSize(
  badge: BadgeDefinition,
  _stats: unknown,
  pStats: PredictionStatsRow | null
): number | null {
  if (badge.metric === 'predictions.winRate') {
    return pStats?.total ?? 0;
  }
  return null;
}

/**
 * Reconcile UserStats from Hive account data.
 *
 * The Hive account has a `post_count` field (total root posts + comments on-chain).
 * If UserStats.totalPosts + totalComments is much lower than the Hive count,
 * this means the user posted on-chain before our tracking was in place.
 * We update UserStats to reflect the Hive counts so badges evaluate correctly.
 *
 * Fire-and-forget — errors logged, never thrown.
 */
export async function reconcileStatsFromHive(username: string): Promise<boolean> {
  try {
    const account = await getAccountOptimized(username);
    if (!account) return false;

    const hivePostCount = (account.post_count as number) || 0;
    if (hivePostCount === 0) return false;

    const stats = await prisma.userStats.findUnique({
      where: { username },
      select: { totalPosts: true, totalComments: true },
    });

    const dbTotal = (stats?.totalPosts ?? 0) + (stats?.totalComments ?? 0);

    // Only reconcile if Hive shows significantly more activity than our DB
    if (hivePostCount <= dbTotal) return false;

    // Hive's post_count includes both root posts and comments.
    // We can't distinguish between them without scanning history, so
    // we attribute the gap to totalPosts (most badges care about posts).
    // This is a conservative approximation — the weekly cron will keep it updated.
    const gap = hivePostCount - dbTotal;

    await prisma.userStats.upsert({
      where: { username },
      create: {
        username,
        totalPosts: gap,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        totalPosts: { increment: gap },
        updatedAt: new Date(),
      },
    });

    logger.info(
      `Reconciled UserStats for ${username}: added ${gap} posts from Hive (hive=${hivePostCount}, db=${dbTotal})`,
      'Badges'
    );
    return true;
  } catch (error) {
    logger.error(`Stats reconciliation failed for ${username}`, 'Badges', error);
    return false;
  }
}

/**
 * Create badge-earned notifications.
 */
async function createBadgeNotifications(username: string, badgeIds: string[]): Promise<void> {
  try {
    // Find the user's profile ID for notification
    const profile = await prisma.profile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!profile) return;

    const badgeDefs = badgeIds
      .map((id) => BADGE_CATALOGUE.find((b) => b.id === id))
      .filter((b): b is BadgeDefinition => b !== undefined);

    if (badgeDefs.length === 0) return;

    await prisma.notification.createMany({
      data: badgeDefs.map((badge) => ({
        recipientId: profile.id,
        type: 'system',
        title: 'Badge Earned!',
        message: `You earned the "${badge.name}" badge — ${badge.description}`,
        data: { badgeId: badge.id, badgeCategory: badge.category },
      })),
    });
  } catch (error) {
    logger.error(`Failed to create badge notifications for ${username}`, 'Badges', error);
  }
}
