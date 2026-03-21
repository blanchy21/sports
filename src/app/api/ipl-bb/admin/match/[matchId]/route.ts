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

const EDITABLE_STATUSES = ['open', 'locked', 'abandoned'];

/**
 * PUT /api/ipl-bb/admin/match/[matchId]
 * Update match status or details. Admin only.
 */
export const PUT = createApiHandler('/api/ipl-bb/admin/match/[matchId]', async (request, ctx) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();
  if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

  const matchId = new URL(request.url).pathname.split('/api/ipl-bb/admin/match/')[1]?.split('/')[0];
  if (!matchId) throw new NotFoundError('Match not found');

  const existing = await prisma.iplBbMatch.findUnique({ where: { id: matchId } });
  if (!existing) throw new NotFoundError('Match not found');
  if (existing.status === 'resolved') throw new ValidationError('Cannot edit a resolved match');

  const body = await request.json();
  const { status, homeTeam, awayTeam, venue, kickoffTime, cricketDataMatchId } = body;

  if (status !== undefined && !EDITABLE_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${EDITABLE_STATUSES.join(', ')}`);
  }

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (homeTeam !== undefined) updateData.homeTeam = homeTeam.trim();
  if (awayTeam !== undefined) updateData.awayTeam = awayTeam.trim();
  if (venue !== undefined) updateData.venue = venue?.trim() || null;
  if (kickoffTime !== undefined) {
    const kickoff = new Date(kickoffTime);
    if (isNaN(kickoff.getTime())) throw new ValidationError('kickoffTime is not a valid date');
    updateData.kickoffTime = kickoff;
  }
  if (cricketDataMatchId !== undefined)
    updateData.cricketDataMatchId = cricketDataMatchId?.trim() || null;

  if (Object.keys(updateData).length === 0) throw new ValidationError('No fields to update');

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
