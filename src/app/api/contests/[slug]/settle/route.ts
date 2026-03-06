/**
 * POST /api/contests/[slug]/settle — Trigger settlement (admin-only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { calculateSettlement } from '@/lib/contests/settlement';

export const POST = createApiHandler('/api/contests/[slug]/settle', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      throw new ForbiddenError('Admin access required');
    }

    const url = new URL(request.url);
    const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];

    const contest = await prisma.contest.findUnique({ where: { slug } });
    if (!contest) throw new NotFoundError('Contest not found');

    // Atomic lock: ACTIVE → CALCULATING
    if (contest.status === 'ACTIVE') {
      const locked = await prisma.contest.updateMany({
        where: { id: contest.id, status: 'ACTIVE' },
        data: { status: 'CALCULATING' },
      });

      if (locked.count === 0) {
        throw new ValidationError('Contest state changed concurrently, please retry');
      }
    } else if (contest.status !== 'CALCULATING') {
      throw new ValidationError(`Contest must be ACTIVE to settle, got: ${contest.status}`);
    }

    // Check all matches have results
    const pendingMatches = await prisma.contestMatch.count({
      where: { contestId: contest.id, homeScore: null },
    });

    if (pendingMatches > 0) {
      // Revert to ACTIVE if not all matches done
      await prisma.contest.update({
        where: { id: contest.id },
        data: { status: 'ACTIVE' },
      });
      throw new ValidationError(`${pendingMatches} matches still need results entered`);
    }

    const body = await request.json().catch(() => ({}));
    const actualTotalGoals = typeof body.actualTotalGoals === 'number' ? body.actualTotalGoals : undefined;

    // Calculate settlement
    const result = await calculateSettlement(contest.id, {
      actualTotalGoals,
    });

    // Mark as settled
    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        settledBy: user.username,
      },
    });

    ctx.log.info('Contest settled', {
      contestId: contest.id,
      slug,
      placements: result.placements.length,
      prizePool: result.prizePoolNet.toString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        contestId: contest.id,
        status: 'SETTLED',
        platformFee: result.platformFee.toNumber(),
        creatorFee: result.creatorFee.toNumber(),
        prizePoolNet: result.prizePoolNet.toNumber(),
        placements: result.placements.map((p) => ({
          placement: p.placement,
          username: p.username,
          totalScore: p.totalScore,
          payoutAmount: p.payoutAmount.toNumber(),
        })),
      },
    });
  });
});
