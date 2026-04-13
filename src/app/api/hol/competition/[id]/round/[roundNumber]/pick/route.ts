import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createApiHandler,
  apiSuccess,
  AuthError,
  NotFoundError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';
import { firstKickoff, validateRoundMatches } from '@/lib/hol/utils';

const bodySchema = z.object({ guess: z.enum(['higher', 'lower']) });

/**
 * POST /api/hol/competition/[id]/round/[roundNumber]/pick
 * Submit or update guess. Locked at first kickoff of the round.
 */
export const POST = createApiHandler(
  '/api/hol/competition/[id]/round/[roundNumber]/pick',
  async (request) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();

      const id = extractPathParam(request.url, 'competition');
      const roundNumberStr = extractPathParam(request.url, 'round');
      if (!id || !roundNumberStr) throw new NotFoundError('Route params missing');
      const roundNumber = parseInt(roundNumberStr, 10);
      if (!Number.isInteger(roundNumber) || roundNumber < 1) {
        throw new ValidationError('Invalid round number');
      }

      const { guess } = bodySchema.parse(await request.json());

      const [competition, round, entry] = await Promise.all([
        prisma.holCompetition.findUnique({ where: { id } }),
        prisma.holRound.findUnique({
          where: { competitionId_roundNumber: { competitionId: id, roundNumber } },
        }),
        prisma.holEntry.findUnique({
          where: { competitionId_username: { competitionId: id, username: user.username } },
        }),
      ]);

      if (!competition) throw new NotFoundError('Competition not found');
      if (!round) throw new NotFoundError('Round not found');
      if (!entry) throw new ValidationError('You have not entered this competition');
      if (entry.status !== 'alive') {
        throw new ValidationError('You are eliminated — buy back first');
      }
      if (round.status !== 'upcoming') {
        throw new ValidationError('Round is locked');
      }

      const matches = round.matches;
      if (!validateRoundMatches(matches)) {
        throw new ValidationError('Round matches are invalid');
      }
      const deadline = firstKickoff(matches) ?? round.deadline;
      if (new Date() >= deadline) throw new ValidationError('Pick deadline has passed');

      await prisma.holPick.upsert({
        where: { entryId_roundNumber: { entryId: entry.id, roundNumber } },
        update: { guess },
        create: { competitionId: id, entryId: entry.id, roundNumber, guess },
      });

      return apiSuccess({ success: true, guess, roundNumber });
    });
  }
);
