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

/**
 * POST /api/lms/competition/[id]/join
 * Auth required. Join a free-entry competition.
 */
export const POST = createApiHandler('/api/lms/competition/[id]/join', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();

  const id = new URL(request.url).pathname.split('/api/lms/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.lmsCompetition.findUnique({ where: { id } });
  if (!competition) throw new NotFoundError('Competition not found');

  // Check competition is accepting entries
  if (competition.status !== 'open' && competition.status !== 'picking') {
    throw new ValidationError('Competition is not accepting entries');
  }

  // Check registration deadline
  if (competition.registrationDeadline && new Date() > competition.registrationDeadline) {
    throw new ValidationError('Registration deadline has passed');
  }

  // Check not already entered
  const existing = await prisma.lmsEntry.findUnique({
    where: {
      competitionId_username: {
        competitionId: id,
        username: user.username,
      },
    },
  });
  if (existing) throw new ValidationError('You have already entered this competition');

  // Create entry and increment total entries atomically
  const [entry] = await prisma.$transaction([
    prisma.lmsEntry.create({
      data: {
        competitionId: id,
        username: user.username,
        status: 'alive',
      },
    }),
    prisma.lmsCompetition.update({
      where: { id },
      data: { totalEntries: { increment: 1 } },
    }),
  ]);

  return apiSuccess({
    id: entry.id,
    competitionId: entry.competitionId,
    username: entry.username,
    status: entry.status,
  });
});
