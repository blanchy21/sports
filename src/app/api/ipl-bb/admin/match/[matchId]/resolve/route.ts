import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { calculatePoints, isBust } from '@/lib/ipl-bb/utils';
import { z } from 'zod';

const resolveSchema = z.object({
  fours: z.number().int().min(0, 'fours must be a non-negative integer'),
  sixes: z.number().int().min(0, 'sixes must be a non-negative integer'),
});

/**
 * POST /api/ipl-bb/admin/match/[matchId]/resolve
 * Enter actual boundary count and resolve match. Admin only.
 * CRITICAL: Uses a Prisma transaction. No pick != bust.
 */
export const POST = createApiHandler(
  '/api/ipl-bb/admin/match/[matchId]/resolve',
  async (request, ctx) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();
      if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

      const matchId = extractPathParam(request.url, 'match');
      if (!matchId) throw new NotFoundError('Match not found');

      const { fours, sixes } = resolveSchema.parse(await request.json());

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

      // Pre-calculate points and aggregate increments per entry
      const pickUpdates = picks.map((pick) => {
        const points = calculatePoints(pick.guess, actualBoundaries);
        const bust = isBust(pick.guess, actualBoundaries);
        return { id: pick.id, entryId: pick.entryId, points, bust };
      });

      const entryIncrements = new Map<
        string,
        { totalPoints: number; bustCount: number; hitCount: number; submittedCount: number }
      >();
      for (const { entryId, points, bust } of pickUpdates) {
        const existing = entryIncrements.get(entryId) ?? {
          totalPoints: 0,
          bustCount: 0,
          hitCount: 0,
          submittedCount: 0,
        };
        existing.totalPoints += points;
        existing.bustCount += bust ? 1 : 0;
        existing.hitCount += bust ? 0 : 1;
        existing.submittedCount += 1;
        entryIncrements.set(entryId, existing);
      }

      await prisma.$transaction(async (tx) => {
        // N pick updates (each has unique pointsScored/isBust)
        for (const { id, points, bust } of pickUpdates) {
          await tx.iplBbPick.update({
            where: { id },
            data: { pointsScored: points, isBust: bust },
          });
        }

        // M entry updates (M <= N, one per unique entry)
        for (const [entryId, inc] of entryIncrements) {
          await tx.iplBbEntry.update({
            where: { id: entryId },
            data: {
              totalPoints: { increment: inc.totalPoints },
              bustCount: { increment: inc.bustCount },
              hitCount: { increment: inc.hitCount },
              submittedCount: { increment: inc.submittedCount },
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
    });
  }
);
