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

const statusSchema = z.object({
  status: z.enum(['open', 'active', 'complete']),
});

/**
 * PUT /api/ipl-bb/admin/competition/[id]
 * Update competition status. Admin only.
 */
export const PUT = createApiHandler('/api/ipl-bb/admin/competition/[id]', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

    const id = extractPathParam(request.url, 'competition');
    if (!id) throw new NotFoundError('Competition not found');

    const { status } = statusSchema.parse(await request.json());

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
});
