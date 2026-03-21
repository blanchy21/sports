import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ValidationError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';
import { validateGuess } from '@/lib/ipl-bb/utils';

/**
 * POST /api/ipl-bb/competition/[id]/pick
 * Submit or update guess. Auth required. Body: { matchId, guess }
 * CRITICAL: deadline check uses match.kickoffTime, not match.status.
 */
export const POST = createApiHandler('/api/ipl-bb/competition/[id]/pick', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();

  const id = new URL(request.url).pathname.split('/api/ipl-bb/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const body = await request.json();
  const { matchId, guess } = body;

  if (!matchId || typeof matchId !== 'string') {
    throw new ValidationError('matchId is required');
  }
  if (!validateGuess(guess)) {
    throw new ValidationError('Guess must be a whole number between 1 and 99');
  }

  const competition = await prisma.iplBbCompetition.findUnique({ where: { id } });
  if (!competition) throw new NotFoundError('Competition not found');
  if (competition.status !== 'active') {
    throw new ValidationError('Competition is not active');
  }

  const match = await prisma.iplBbMatch.findUnique({ where: { id: matchId } });
  if (!match || match.competitionId !== id) {
    throw new NotFoundError('Match not found');
  }
  if (match.status !== 'open') {
    throw new ValidationError('Match is not open for picks');
  }
  // HARD CUTOFF — timestamp is the source of truth
  if (new Date() >= match.kickoffTime) {
    throw new ValidationError('Pick deadline has passed');
  }

  const entry = await prisma.iplBbEntry.findUnique({
    where: { competitionId_username: { competitionId: id, username: user.username } },
  });
  if (!entry) {
    throw new ValidationError('You have not entered this competition');
  }

  // Upsert pick — firstSubmittedAt is NOT updated on upsert
  await prisma.iplBbPick.upsert({
    where: { matchId_username: { matchId, username: user.username } },
    update: { guess },
    create: {
      competitionId: id,
      matchId,
      entryId: entry.id,
      username: user.username,
      guess,
      firstSubmittedAt: new Date(),
    },
  });

  return apiSuccess({ success: true, guess });
});
