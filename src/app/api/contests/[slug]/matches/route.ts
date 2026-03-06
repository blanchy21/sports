/**
 * GET /api/contests/[slug]/matches — List matches
 * POST /api/contests/[slug]/matches — Add matches (admin-only, batch)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { serializeMatch } from '@/lib/contests/serialize';

export const GET = createApiHandler('/api/contests/[slug]/matches', async (request) => {
  const url = new URL(request.url);
  const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];
  const round = url.searchParams.get('round');

  if (!slug) throw new NotFoundError('Contest not found');

  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) throw new NotFoundError('Contest not found');

  const where: Record<string, unknown> = { contestId: contest.id };
  if (round) where.round = round;

  const matches = await prisma.contestMatch.findMany({
    where,
    orderBy: [{ matchNumber: 'asc' }],
  });

  return NextResponse.json({
    success: true,
    data: matches.map(serializeMatch),
  });
});

export const POST = createApiHandler('/api/contests/[slug]/matches', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      throw new ForbiddenError('Admin access required');
    }

    const url = new URL(request.url);
    const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];

    const contest = await prisma.contest.findUnique({ where: { slug } });
    if (!contest) throw new NotFoundError('Contest not found');

    const body = await request.json();
    const { matches } = body;

    if (!Array.isArray(matches) || matches.length === 0) {
      throw new ValidationError('matches must be a non-empty array');
    }

    // Validate each match
    for (const match of matches) {
      if (!match.matchNumber || !match.round || !match.homeTeamCode || !match.awayTeamCode || !match.scheduledAt) {
        throw new ValidationError('Each match requires: matchNumber, round, homeTeamCode, awayTeamCode, scheduledAt');
      }
    }

    const created = await prisma.contestMatch.createMany({
      data: matches.map((m: Record<string, unknown>) => ({
        contestId: contest.id,
        matchNumber: Number(m.matchNumber),
        round: String(m.round),
        groupLetter: m.groupLetter ? String(m.groupLetter) : null,
        homeTeamCode: String(m.homeTeamCode),
        awayTeamCode: String(m.awayTeamCode),
        scheduledAt: new Date(m.scheduledAt as string),
      })),
      skipDuplicates: true,
    });

    ctx.log.info('Matches added', { contestId: contest.id, count: created.count });

    return NextResponse.json({
      success: true,
      data: { created: created.count },
    }, { status: 201 });
  });
});
