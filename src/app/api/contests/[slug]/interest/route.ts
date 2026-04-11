/**
 * POST /api/contests/[slug]/interest — Toggle interest (express / withdraw)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { NotFoundError, UnauthorizedError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';

export const POST = createApiHandler('/api/contests/[slug]/interest', async (request, _ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new UnauthorizedError('Sign in to express interest');

    const slug = extractPathParam(request.url, 'contests') ?? '';

    const contest = await prisma.contest.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!contest) throw new NotFoundError('Contest not found');

    // Toggle: delete if exists, create if not
    const existing = await prisma.contestInterest.findUnique({
      where: { contestId_username: { contestId: contest.id, username: user.username } },
    });

    if (existing) {
      await prisma.contestInterest.delete({ where: { id: existing.id } });
    } else {
      await prisma.contestInterest.create({
        data: { contestId: contest.id, username: user.username },
      });
    }

    const interestCount = await prisma.contestInterest.count({
      where: { contestId: contest.id },
    });

    return NextResponse.json({
      success: true,
      data: { isInterested: !existing, interestCount },
    });
  });
});
