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
import type { CompetitionStatus } from '@/lib/ipl-bb/types';

const VALID_STATUSES: CompetitionStatus[] = ['open', 'active', 'complete'];

/**
 * PUT /api/ipl-bb/admin/competition/[id]
 * Update competition status. Admin only.
 */
export const PUT = createApiHandler('/api/ipl-bb/admin/competition/[id]', async (request, ctx) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();
  if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

  const id = new URL(request.url).pathname
    .split('/api/ipl-bb/admin/competition/')[1]
    ?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const body = await request.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const existing = await prisma.iplBbCompetition.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Competition not found');

  const competition = await prisma.iplBbCompetition.update({
    where: { id },
    data: { status },
  });

  ctx.log.info('Competition status updated', {
    competitionId: id,
    oldStatus: existing.status,
    newStatus: status,
  });

  return apiSuccess({ id: competition.id, title: competition.title, status: competition.status });
});
