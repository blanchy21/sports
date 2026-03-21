import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, NotFoundError, AuthError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';
import type { IplBbPickWithResult } from '@/lib/ipl-bb/types';

/**
 * GET /api/ipl-bb/competition/[id]/my-picks
 * User's picks with match details. Auth required.
 */
export const GET = createApiHandler('/api/ipl-bb/competition/[id]/my-picks', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();

  const id = new URL(request.url).pathname.split('/api/ipl-bb/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.iplBbCompetition.findUnique({ where: { id } });
  if (!competition) throw new NotFoundError('Competition not found');

  const matches = await prisma.iplBbMatch.findMany({
    where: { competitionId: id },
    orderBy: { matchNumber: 'asc' },
  });

  const picks = await prisma.iplBbPick.findMany({
    where: { competitionId: id, username: user.username },
  });

  const pickByMatch = new Map(picks.map((p) => [p.matchId, p]));

  const result: IplBbPickWithResult[] = matches.map((m) => {
    const pick = pickByMatch.get(m.id);
    return {
      matchId: m.id,
      matchNumber: m.matchNumber,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffTime: m.kickoffTime.toISOString(),
      matchStatus: m.status as IplBbPickWithResult['matchStatus'],
      guess: pick?.guess ?? null,
      pointsScored: pick?.pointsScored ?? null,
      isBust: pick?.isBust ?? null,
      actualBoundaries: m.actualBoundaries,
    };
  });

  return apiSuccess(result);
});
