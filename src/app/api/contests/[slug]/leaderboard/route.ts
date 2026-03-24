/**
 * GET /api/contests/[slug]/leaderboard — Paginated leaderboard
 */

import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { NotFoundError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { serializeLeaderboardEntry } from '@/lib/contests/serialize';
import { CONTEST_TYPES } from '@/lib/contests/constants';

export const GET = createApiHandler('/api/contests/[slug]/leaderboard', async (request) => {
  const url = new URL(request.url);
  const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  if (!slug) throw new NotFoundError('Contest not found');

  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) throw new NotFoundError('Contest not found');

  // Golf sorts ascending (lower = better), others descending
  const isGolf = contest.contestType === CONTEST_TYPES.GOLF_FANTASY;
  const sortOrder = isGolf ? 'asc' : 'desc';

  const entries = await prisma.contestEntry.findMany({
    where: { contestId: contest.id },
    orderBy: [{ rank: 'asc' }, { totalScore: sortOrder as 'asc' | 'desc' }, { createdAt: 'asc' }],
    take: limit,
    skip: offset,
  });

  const total = contest.entryCount;

  // For golf, also include golfer team metadata so the leaderboard can show per-round scores
  let golferScores: Record<string, unknown> | undefined;
  if (isGolf) {
    const teams = await prisma.contestTeam.findMany({
      where: { contestId: contest.id },
      select: { code: true, name: true, metadata: true },
    });
    golferScores = {};
    for (const t of teams) {
      (golferScores as Record<string, unknown>)[t.code] = {
        name: t.name,
        ...((t.metadata as Record<string, unknown>) || {}),
      };
    }
  }

  return NextResponse.json({
    success: true,
    data: entries.map((entry, i) => serializeLeaderboardEntry(entry, entry.rank ?? offset + i + 1)),
    ...(golferScores ? { golferScores } : {}),
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + entries.length < total,
    },
  });
});
