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

/**
 * PUT /api/lms/admin/competition/[id]
 * Admin only. Update competition status or advance gameweek.
 */
export const PUT = createApiHandler('/api/lms/admin/competition/[id]', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();
  if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

  const id = new URL(request.url).pathname.split('/api/lms/admin/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.lmsCompetition.findUnique({ where: { id } });
  if (!competition) throw new NotFoundError('Competition not found');

  const body = await request.json();
  const { status, currentGameweek } = body as {
    status?: string;
    currentGameweek?: number;
  };

  if (!status && currentGameweek === undefined) {
    throw new ValidationError('Provide status or currentGameweek to update');
  }

  const validStatuses = ['open', 'picking', 'locked', 'results', 'complete'];
  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (currentGameweek !== undefined) updateData.currentGameweek = currentGameweek;
  if (status === 'complete') updateData.completedAt = new Date();

  const updated = await prisma.lmsCompetition.update({
    where: { id },
    data: updateData,
  });

  return apiSuccess({
    id: updated.id,
    status: updated.status,
    currentGameweek: updated.currentGameweek,
    completedAt: updated.completedAt?.toISOString() ?? null,
  });
});
