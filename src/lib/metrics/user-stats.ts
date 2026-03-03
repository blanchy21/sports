/**
 * Lifetime User Stats
 *
 * Aggregated per-user stats that persist across weeks.
 * UserMetric tracks weekly-scoped data; this tracks lifetime totals.
 *
 * All functions are fire-and-forget — they catch errors internally
 * and never throw, matching the pattern in tracker.ts.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentWeekId } from './tracker';

type IncrementableField =
  | 'totalPosts'
  | 'totalSportsbites'
  | 'totalComments'
  | 'totalViewsReceived';

/**
 * Atomically increment a numeric stat for a user.
 * Creates the row if it doesn't exist yet.
 */
export async function incrementUserStat(
  username: string,
  field: IncrementableField,
  amount: number = 1
): Promise<void> {
  try {
    await prisma.userStats.upsert({
      where: { username },
      create: {
        username,
        [field]: amount,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        [field]: { increment: amount },
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[UserStats] Failed to increment ${field} for ${username}:`, error);
  }
}

/**
 * Update posting streak based on current week vs last recorded post week.
 *
 * Logic:
 * - If lastPostWeek === currentWeek → already counted, skip
 * - If lastPostWeek === previousWeek → consecutive, increment streak
 * - Otherwise → gap in posting, reset streak to 1
 * - Always update longestPostingStreak = max(current, longest)
 */
export async function updatePostingStreak(username: string): Promise<void> {
  try {
    const currentWeek = getCurrentWeekId();

    const stats = await prisma.userStats.findUnique({
      where: { username },
      select: { lastPostWeek: true, currentPostingStreak: true, longestPostingStreak: true },
    });

    if (stats?.lastPostWeek === currentWeek) {
      return; // Already tracked this week
    }

    const previousWeek = getPreviousWeekId(currentWeek);
    const isConsecutive = stats?.lastPostWeek === previousWeek;
    const newStreak = isConsecutive ? (stats?.currentPostingStreak ?? 0) + 1 : 1;
    const longestStreak = Math.max(newStreak, stats?.longestPostingStreak ?? 0);

    await prisma.userStats.upsert({
      where: { username },
      create: {
        username,
        currentPostingStreak: newStreak,
        longestPostingStreak: longestStreak,
        lastPostWeek: currentWeek,
        updatedAt: new Date(),
      },
      update: {
        currentPostingStreak: newStreak,
        longestPostingStreak: longestStreak,
        lastPostWeek: currentWeek,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[UserStats] Failed to update posting streak for ${username}:`, error);
  }
}

/**
 * Touch the user's lastActiveAt timestamp.
 */
export async function touchActivity(username: string): Promise<void> {
  try {
    await prisma.userStats.upsert({
      where: { username },
      create: { username, lastActiveAt: new Date(), updatedAt: new Date() },
      update: { lastActiveAt: new Date(), updatedAt: new Date() },
    });
  } catch (error) {
    console.error(`[UserStats] Failed to touch activity for ${username}:`, error);
  }
}

/**
 * Get lifetime stats for a user.
 */
export async function getUserStats(username: string) {
  try {
    return await prisma.userStats.findUnique({ where: { username } });
  } catch (error) {
    console.error(`[UserStats] Failed to get stats for ${username}:`, error);
    return null;
  }
}

/**
 * One-time backfill: aggregate all existing UserMetric rows into UserStats.
 */
export async function backfillUserStats(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Aggregate all weekly user metrics by account
    const aggregated = await prisma.userMetric.groupBy({
      by: ['account'],
      _sum: {
        postsCreated: true,
        totalViews: true,
        commentsMade: true,
      },
    });

    for (const row of aggregated) {
      try {
        await prisma.userStats.upsert({
          where: { username: row.account },
          create: {
            username: row.account,
            totalPosts: row._sum.postsCreated ?? 0,
            totalViewsReceived: row._sum.totalViews ?? 0,
            totalComments: row._sum.commentsMade ?? 0,
            updatedAt: new Date(),
          },
          update: {
            totalPosts: row._sum.postsCreated ?? 0,
            totalViewsReceived: row._sum.totalViews ?? 0,
            totalComments: row._sum.commentsMade ?? 0,
            updatedAt: new Date(),
          },
        });
        processed++;
      } catch (err) {
        console.error(`[UserStats] Backfill error for ${row.account}:`, err);
        errors++;
      }
    }
  } catch (error) {
    console.error('[UserStats] Backfill failed:', error);
  }

  return { processed, errors };
}

/**
 * Calculate the previous ISO week ID given a current week ID.
 * E.g. "2026-W10" -> "2026-W09", "2026-W01" -> "2025-W52"
 */
function getPreviousWeekId(weekId: string): string {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return '';

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  if (week > 1) {
    return `${year}-W${(week - 1).toString().padStart(2, '0')}`;
  }

  // Week 1 → previous year's last week
  // ISO 8601: a year has 52 or 53 weeks
  const dec28 = new Date(year - 1, 11, 28); // Dec 28 is always in the last ISO week
  const dayOfWeek = dec28.getDay() || 7;
  dec28.setDate(dec28.getDate() + (4 - dayOfWeek)); // Thursday of that week
  const yearStart = new Date(dec28.getFullYear(), 0, 1);
  const lastWeek = Math.ceil(((dec28.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${year - 1}-W${lastWeek.toString().padStart(2, '0')}`;
}
