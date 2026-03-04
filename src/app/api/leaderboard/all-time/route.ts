/**
 * All-Time Leaderboard API
 *
 * Queries UserStats directly for lifetime rankings.
 * No stored table needed — computed on-the-fly, cached 30min.
 */

import { prisma } from '@/lib/db/prisma';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import type { LeaderboardEntry } from '@/lib/metrics/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_METRICS = ['posts', 'sportsbites', 'comments', 'views', 'medals'] as const;
type AllTimeMetric = (typeof VALID_METRICS)[number];

const METRIC_TO_FIELD: Record<AllTimeMetric, string> = {
  posts: 'totalPosts',
  sportsbites: 'totalSportsbites',
  comments: 'totalComments',
  views: 'totalViewsReceived',
  medals: 'totalMedalsEarned',
};

export const GET = createApiHandler('/api/leaderboard/all-time', async (request) => {
  const { searchParams } = new URL(request.url);
  const metricParam = searchParams.get('metric') ?? 'medals';
  const limitParam = Math.min(Number(searchParams.get('limit') ?? 50), 100);

  if (!VALID_METRICS.includes(metricParam as AllTimeMetric)) {
    return apiError(
      `Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  const metric = metricParam as AllTimeMetric;
  const field = METRIC_TO_FIELD[metric];

  const users = await prisma.userStats.findMany({
    orderBy: { [field]: 'desc' },
    take: limitParam,
    select: {
      username: true,
      totalPosts: true,
      totalSportsbites: true,
      totalComments: true,
      totalViewsReceived: true,
      totalMedalsEarned: true,
    },
  });

  const entries: LeaderboardEntry[] = users
    .map((u, i) => ({
      rank: i + 1,
      account: u.username,
      value: Number(u[field as keyof typeof u]),
    }))
    .filter((e) => e.value > 0);

  return apiSuccess(
    { metric, entries, total: entries.length },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
  );
});
