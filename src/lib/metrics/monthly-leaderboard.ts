/**
 * Monthly Leaderboard Generator
 *
 * Aggregates Posts + Sportsbites for a calendar month into overall
 * and per-sport leaderboards, stored in `MonthlyLeaderboard`.
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import type { LeaderboardEntry } from './types';

/** Returns "YYYY-MM" for the given date (defaults to now). */
export function getMonthId(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Returns the previous month ID, e.g. "2026-03" → "2026-02". */
export function getPreviousMonthId(monthId: string): string {
  const [year, month] = monthId.split('-').map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** Returns the next month ID, e.g. "2026-02" → "2026-03". */
export function getNextMonthId(monthId: string): string {
  const [year, month] = monthId.split('-').map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Returns { start, end } Date range for a monthId (UTC). */
function getMonthRange(monthId: string): { start: Date; end: Date } {
  const [year, month] = monthId.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // exclusive upper bound
  return { start, end };
}

/** Sentinel sportId for the overall (all-sport) monthly leaderboard. */
export const OVERALL_SPORT_ID = '_overall';

/** Min active users per sport to generate a sport-specific leaderboard. */
const MIN_SPORT_USERS = 3;

export interface MonthlyLeaderboardResult {
  monthId: string;
  overall: LeaderboardEntry[];
  perSport: Record<string, LeaderboardEntry[]>;
  generatedAt: Date;
}

/**
 * Generate monthly leaderboards for the given monthId.
 *
 * Creates an overall leaderboard (posts + sportsbites combined),
 * plus per-sport boards where ≥ MIN_SPORT_USERS contributed.
 */
export async function generateMonthlyLeaderboards(
  monthId: string
): Promise<MonthlyLeaderboardResult> {
  const { start, end } = getMonthRange(monthId);

  // Fetch posts and sportsbites for the month in parallel
  const [posts, sportsbites, comments] = await Promise.all([
    prisma.post.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        authorUsername: true,
        sportCategory: true,
        viewCount: true,
      },
    }),
    prisma.sportsbite.findMany({
      where: { createdAt: { gte: start, lt: end }, isDeleted: false },
      select: {
        authorUsername: true,
        sportCategory: true,
      },
    }),
    prisma.comment.findMany({
      where: { createdAt: { gte: start, lt: end }, isDeleted: false },
      select: { authorUsername: true },
    }),
  ]);

  // Aggregate per-user totals (overall)
  const userTotals = new Map<
    string,
    { posts: number; sportsbites: number; comments: number; views: number }
  >();

  const ensure = (username: string) => {
    if (!userTotals.has(username)) {
      userTotals.set(username, { posts: 0, sportsbites: 0, comments: 0, views: 0 });
    }
    return userTotals.get(username)!;
  };

  for (const p of posts) {
    const u = ensure(p.authorUsername);
    u.posts++;
    u.views += p.viewCount;
  }
  for (const s of sportsbites) {
    ensure(s.authorUsername).sportsbites++;
  }
  for (const c of comments) {
    ensure(c.authorUsername).comments++;
  }

  // Overall leaderboard: rank by total content (posts + sportsbites)
  const overall: LeaderboardEntry[] = Array.from(userTotals.entries())
    .map(([account, t]) => ({ account, value: t.posts + t.sportsbites }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((e, i) => ({ rank: i + 1, account: e.account, value: e.value }));

  // Per-sport aggregation
  const sportUsers = new Map<string, Map<string, number>>(); // sportId → (user → content count)

  for (const p of posts) {
    const sport = p.sportCategory ?? 'general';
    if (!sportUsers.has(sport)) sportUsers.set(sport, new Map());
    const map = sportUsers.get(sport)!;
    map.set(p.authorUsername, (map.get(p.authorUsername) ?? 0) + 1);
  }
  for (const s of sportsbites) {
    const sport = s.sportCategory ?? 'general';
    if (!sportUsers.has(sport)) sportUsers.set(sport, new Map());
    const map = sportUsers.get(sport)!;
    map.set(s.authorUsername, (map.get(s.authorUsername) ?? 0) + 1);
  }

  const perSport: Record<string, LeaderboardEntry[]> = {};

  for (const [sportId, users] of sportUsers) {
    if (users.size < MIN_SPORT_USERS) continue;

    perSport[sportId] = Array.from(users.entries())
      .map(([account, value]) => ({ account, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50)
      .map((e, i) => ({ rank: i + 1, account: e.account, value: e.value }));
  }

  const generatedAt = new Date();

  // Store overall leaderboard (use sentinel '_overall' since Prisma unique can't match null)
  await prisma.monthlyLeaderboard.upsert({
    where: { monthId_sportId: { monthId, sportId: OVERALL_SPORT_ID } },
    create: {
      monthId,
      sportId: OVERALL_SPORT_ID,
      entries: overall as unknown as Prisma.InputJsonValue,
      generatedAt,
    },
    update: {
      entries: overall as unknown as Prisma.InputJsonValue,
      generatedAt,
    },
  });

  // Store per-sport leaderboards
  for (const [sportId, entries] of Object.entries(perSport)) {
    await prisma.monthlyLeaderboard.upsert({
      where: { monthId_sportId: { monthId, sportId } },
      create: {
        monthId,
        sportId,
        entries: entries as unknown as Prisma.InputJsonValue,
        generatedAt,
      },
      update: {
        entries: entries as unknown as Prisma.InputJsonValue,
        generatedAt,
      },
    });
  }

  return { monthId, overall, perSport, generatedAt };
}
