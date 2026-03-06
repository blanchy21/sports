/**
 * GET /api/contests/[slug]/leaderboard — Paginated leaderboard
 */

import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { NotFoundError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { serializeLeaderboardEntry } from '@/lib/contests/serialize';

export const GET = createApiHandler('/api/contests/[slug]/leaderboard', async (request) => {
  const url = new URL(request.url);
  const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  if (!slug) throw new NotFoundError('Contest not found');

  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) throw new NotFoundError('Contest not found');

  const entries = await prisma.contestEntry.findMany({
    where: { contestId: contest.id },
    orderBy: [{ totalScore: 'desc' }, { createdAt: 'asc' }],
    take: limit,
    skip: offset,
  });

  const total = contest.entryCount;

  return NextResponse.json({
    success: true,
    data: entries.map((entry, i) => serializeLeaderboardEntry(entry, offset + i + 1)),
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + entries.length < total,
    },
  });
});
