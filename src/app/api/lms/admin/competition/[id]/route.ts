import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z
  .object({
    status: z.enum(['open', 'picking', 'locked', 'results', 'complete']).optional(),
    currentGameweek: z.number().int().optional(),
  })
  .refine((data) => data.status !== undefined || data.currentGameweek !== undefined, {
    message: 'Provide status or currentGameweek to update',
  });

/**
 * PUT /api/lms/admin/competition/[id]
 * Admin only. Update competition status or advance gameweek.
 */
export const PUT = createApiHandler('/api/lms/admin/competition/[id]', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

    const id = extractPathParam(request.url, 'competition');
    if (!id) throw new NotFoundError('Competition not found');

    const competition = await prisma.lmsCompetition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundError('Competition not found');

    const { status, currentGameweek } = updateSchema.parse(await request.json());

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
});
