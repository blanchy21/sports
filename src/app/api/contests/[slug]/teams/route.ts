/**
 * GET /api/contests/[slug]/teams — List teams for this contest
 */

import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { NotFoundError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { serializeTeam } from '@/lib/contests/serialize';

export const GET = createApiHandler('/api/contests/[slug]/teams', async (request) => {
  const url = new URL(request.url);
  const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];

  if (!slug) throw new NotFoundError('Contest not found');

  const contest = await prisma.contest.findUnique({
    where: { slug },
    include: { teams: { orderBy: [{ pot: 'asc' }, { name: 'asc' }] } },
  });

  if (!contest) throw new NotFoundError('Contest not found');

  return NextResponse.json({
    success: true,
    data: contest.teams.map(serializeTeam),
  });
});
