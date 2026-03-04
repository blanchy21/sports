/**
 * Monthly Leaderboard API
 *
 * Returns stored monthly leaderboard + optional title holder.
 */

import { prisma } from '@/lib/db/prisma';
import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { OVERALL_SPORT_ID } from '@/lib/metrics/monthly-leaderboard';
import type { LeaderboardEntry } from '@/lib/metrics/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler('/api/leaderboard/monthly', async (request) => {
  const { searchParams } = new URL(request.url);
  const monthId = searchParams.get('monthId');
  const sportId = searchParams.get('sportId') ?? OVERALL_SPORT_ID;

  if (!monthId) {
    return apiSuccess({ entries: [], monthId: null, titleHolder: null });
  }

  // Fetch leaderboard
  const board = await prisma.monthlyLeaderboard.findUnique({
    where: { monthId_sportId: { monthId, sportId } },
  });

  const entries: LeaderboardEntry[] = board ? (board.entries as unknown as LeaderboardEntry[]) : [];

  // Fetch title holder if viewing a specific sport
  let titleHolder: {
    username: string;
    badgeId: string;
    score: number;
  } | null = null;

  if (sportId !== OVERALL_SPORT_ID) {
    const title = await prisma.monthlyTitle.findUnique({
      where: { monthId_sportId: { monthId, sportId } },
    });

    if (title) {
      titleHolder = {
        username: title.username,
        badgeId: title.badgeId,
        score: Number(title.score),
      };
    }
  }

  return apiSuccess(
    {
      monthId,
      sportId,
      entries,
      titleHolder,
      generatedAt: board?.generatedAt?.toISOString() ?? null,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
});
