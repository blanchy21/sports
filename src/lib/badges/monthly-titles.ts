/**
 * Monthly Title Badge Assignment
 *
 * Awards "{sport}-writer-{monthId}" badges to the #1 user
 * in each sport's monthly leaderboard.
 */

import { prisma } from '@/lib/db/prisma';
import { getPreviousMonthId, OVERALL_SPORT_ID } from '@/lib/metrics/monthly-leaderboard';
import { SPORT_CATEGORIES } from '@/types/sports';
import type { LeaderboardEntry } from '@/lib/metrics/types';

export interface MonthlyTitleResult {
  sportId: string;
  username: string;
  badgeId: string;
  score: number;
}

/**
 * Look up sport display name from SPORT_CATEGORIES.
 */
function getSportName(sportId: string): string {
  const cat = SPORT_CATEGORIES.find((c) => c.id === sportId);
  return cat?.name ?? sportId.charAt(0).toUpperCase() + sportId.slice(1);
}

/**
 * Assign monthly title badges for the given month.
 *
 * For each sport with a per-sport monthly leaderboard:
 *   - Take the #1 ranked user
 *   - Create a MonthlyTitle record
 *   - Upsert a UserBadge with dynamically generated badgeId
 *   - Clear previous month's title badges
 */
export async function assignMonthlyTitles(monthId: string): Promise<MonthlyTitleResult[]> {
  // Fetch all per-sport leaderboards for this month (exclude the overall sentinel)
  const sportBoards = await prisma.monthlyLeaderboard.findMany({
    where: {
      monthId,
      sportId: { not: OVERALL_SPORT_ID },
    },
  });

  const results: MonthlyTitleResult[] = [];

  for (const board of sportBoards) {
    const entries = board.entries as unknown as LeaderboardEntry[];
    if (!entries || entries.length === 0) continue;

    const winner = entries[0];
    const sportId = board.sportId!;
    const badgeId = `${sportId}-writer-${monthId}`;
    const score = winner.value;

    // Create MonthlyTitle record (upsert by unique constraint)
    await prisma.monthlyTitle.upsert({
      where: { monthId_sportId: { monthId, sportId } },
      create: {
        monthId,
        sportId,
        username: winner.account,
        badgeId,
        score,
      },
      update: {
        username: winner.account,
        badgeId,
        score,
      },
    });

    // Award badge to winner
    await prisma.userBadge.upsert({
      where: { username_badgeId: { username: winner.account, badgeId } },
      create: {
        username: winner.account,
        badgeId,
      },
      update: {},
    });

    results.push({
      sportId,
      username: winner.account,
      badgeId,
      score,
    });
  }

  // Clear previous month's title badges
  const prevMonthId = getPreviousMonthId(monthId);
  const prevTitles = await prisma.monthlyTitle.findMany({
    where: { monthId: prevMonthId },
  });

  for (const prev of prevTitles) {
    await prisma.userBadge.deleteMany({
      where: { username: prev.username, badgeId: prev.badgeId },
    });
  }

  return results;
}

/**
 * Get the monthly title holder for a specific sport + month.
 */
export async function getMonthlyTitleHolder(
  monthId: string,
  sportId: string
): Promise<{ username: string; badgeId: string; score: number; sportName: string } | null> {
  const title = await prisma.monthlyTitle.findUnique({
    where: { monthId_sportId: { monthId, sportId } },
  });

  if (!title) return null;

  return {
    username: title.username,
    badgeId: title.badgeId,
    score: Number(title.score),
    sportName: getSportName(sportId),
  };
}
