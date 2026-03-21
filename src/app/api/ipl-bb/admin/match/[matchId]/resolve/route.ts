import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { calculatePoints, isBust } from '@/lib/ipl-bb/utils';

/**
 * POST /api/ipl-bb/admin/match/[matchId]/resolve
 * Enter actual boundary count and resolve match. Admin only.
 * CRITICAL: Uses a Prisma transaction. No pick != bust.
 */
export const POST = createApiHandler(
  '/api/ipl-bb/admin/match/[matchId]/resolve',
  async (request, ctx) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

    const matchId = new URL(request.url).pathname
      .split('/api/ipl-bb/admin/match/')[1]
      ?.split('/')[0];
    if (!matchId) throw new NotFoundError('Match not found');

    const body = await request.json();
    const { fours, sixes } = body;

    if (typeof fours !== 'number' || fours < 0 || !Number.isInteger(fours)) {
      throw new ValidationError('fours must be a non-negative integer');
    }
    if (typeof sixes !== 'number' || sixes < 0 || !Number.isInteger(sixes)) {
      throw new ValidationError('sixes must be a non-negative integer');
    }

    const match = await prisma.iplBbMatch.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundError('Match not found');
    if (match.status === 'resolved') throw new ValidationError('Match is already resolved');
    if (match.status === 'abandoned')
      throw new ValidationError('Cannot resolve an abandoned match');

    const actualBoundaries = fours + sixes;

    const picks = await prisma.iplBbPick.findMany({ where: { matchId } });

    ctx.log.info('Resolving match', {
      matchId,
      fours,
      sixes,
      actualBoundaries,
      pickCount: picks.length,
    });

    await prisma.$transaction(async (tx) => {
      for (const pick of picks) {
        const points = calculatePoints(pick.guess, actualBoundaries);
        const bust = isBust(pick.guess, actualBoundaries);

        await tx.iplBbPick.update({
          where: { id: pick.id },
          data: { pointsScored: points, isBust: bust },
        });

        await tx.iplBbEntry.update({
          where: { id: pick.entryId },
          data: {
            totalPoints: { increment: points },
            bustCount: { increment: bust ? 1 : 0 },
            hitCount: { increment: bust ? 0 : 1 },
            submittedCount: { increment: 1 },
          },
        });
      }

      await tx.iplBbMatch.update({
        where: { id: matchId },
        data: {
          actualBoundaries,
          fours,
          sixes,
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: user.username,
        },
      });
    });

    const bustCount = picks.filter((p) => isBust(p.guess, actualBoundaries)).length;

    ctx.log.info('Match resolved', {
      matchId,
      actualBoundaries,
      picksScored: picks.length,
      busts: bustCount,
    });

    return apiSuccess({
      matchId,
      actualBoundaries,
      fours,
      sixes,
      picksScored: picks.length,
      busts: bustCount,
      hits: picks.length - bustCount,
    });
  }
);
