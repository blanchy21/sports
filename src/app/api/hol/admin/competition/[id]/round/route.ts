import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createApiHandler,
  apiSuccess,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';
import { serializeRound } from '@/lib/hol/serialize';
import { validateRoundMatches } from '@/lib/hol/utils';

const matchSchema = z.object({
  league: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  kickoff: z.string().min(1),
  homeGoals: z.number().int().nonnegative().optional(),
  awayGoals: z.number().int().nonnegative().optional(),
  postponed: z.boolean().optional(),
});

const bodySchema = z.object({
  roundNumber: z.number().int().min(2),
  deadline: z.string().min(1),
  matches: z.array(matchSchema).length(5),
});

/**
 * POST /api/hol/admin/competition/[id]/round
 * Add a new round. Baseline = previous round's actualTotal, so the previous
 * round must already be resolved.
 */
export const POST = createApiHandler('/api/hol/admin/competition/[id]/round', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!requireAdmin(user)) throw new ForbiddenError('Admin access required');

    const id = extractPathParam(request.url, 'competition');
    if (!id) throw new NotFoundError('Competition not found');

    const body = bodySchema.parse(await request.json());
    if (!validateRoundMatches(body.matches)) {
      throw new ValidationError('Invalid match payload');
    }

    const prior = await prisma.holRound.findUnique({
      where: {
        competitionId_roundNumber: {
          competitionId: id,
          roundNumber: body.roundNumber - 1,
        },
      },
    });
    if (!prior) throw new ValidationError('Previous round does not exist');
    if (prior.status !== 'resolved' || prior.actualTotal == null) {
      throw new ValidationError('Previous round must be resolved before adding the next');
    }

    const round = await prisma.holRound.create({
      data: {
        competitionId: id,
        roundNumber: body.roundNumber,
        status: 'upcoming',
        deadline: new Date(body.deadline),
        baselineTotal: prior.actualTotal,
        matches: body.matches,
      },
    });

    return apiSuccess({ round: serializeRound(round) });
  });
});
