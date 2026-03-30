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
import { z } from 'zod';

const updateMatchSchema = z
  .object({
    status: z.enum(['open', 'locked', 'abandoned']).optional(),
    homeTeam: z.string().optional(),
    awayTeam: z.string().optional(),
    venue: z.string().nullable().optional(),
    kickoffTime: z.string().datetime().optional(),
    cricketDataMatchId: z.string().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'No fields to update',
  });

/**
 * PUT /api/ipl-bb/admin/match/[matchId]
 * Update match status or details. Admin only.
 */
export const PUT = createApiHandler('/api/ipl-bb/admin/match/[matchId]', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

    const matchId = extractPathParam(request.url, 'match');
    if (!matchId) throw new NotFoundError('Match not found');

    const existing = await prisma.iplBbMatch.findUnique({ where: { id: matchId } });
    if (!existing) throw new NotFoundError('Match not found');
    if (existing.status === 'resolved') throw new ValidationError('Cannot edit a resolved match');

    const { status, homeTeam, awayTeam, venue, kickoffTime, cricketDataMatchId } =
      updateMatchSchema.parse(await request.json());

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (homeTeam !== undefined) updateData.homeTeam = homeTeam.trim();
    if (awayTeam !== undefined) updateData.awayTeam = awayTeam.trim();
    if (venue !== undefined) updateData.venue = venue?.trim() || null;
    if (kickoffTime !== undefined) updateData.kickoffTime = new Date(kickoffTime);
    if (cricketDataMatchId !== undefined)
      updateData.cricketDataMatchId = cricketDataMatchId?.trim() || null;

    const match = await prisma.iplBbMatch.update({ where: { id: matchId }, data: updateData });

    ctx.log.info('Match updated', { matchId, fields: Object.keys(updateData) });

    return apiSuccess({
      id: match.id,
      matchNumber: match.matchNumber,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffTime: match.kickoffTime.toISOString(),
      status: match.status,
    });
  });
});
