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
 * POST /api/ipl-bb/competition/[id]/join
 * Register entry. Auth required. Idempotent.
 */
export const POST = createApiHandler('/api/ipl-bb/competition/[id]/join', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();

  const id = new URL(request.url).pathname.split('/api/ipl-bb/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.iplBbCompetition.findUnique({ where: { id } });
  if (!competition) throw new NotFoundError('Competition not found');

  if (!['open', 'active'].includes(competition.status)) {
    throw new ValidationError('Competition is not accepting entries');
  }

  try {
    await prisma.$transaction([
      prisma.iplBbEntry.create({
        data: { competitionId: id, username: user.username },
      }),
      prisma.iplBbCompetition.update({
        where: { id },
        data: { totalEntries: { increment: 1 } },
      }),
    ]);
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      return apiSuccess({ success: true, alreadyEntered: true });
    }
    throw e;
  }

  return apiSuccess({ success: true });
});
