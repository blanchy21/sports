import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, NotFoundError, AuthError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';
import { getAvailableTeams } from '@/lib/lms/utils';

/**
 * GET /api/lms/competition/[id]/my-pick
 * Auth required. Returns user's entry, current pick, history, and available teams.
 */
export const GET = createApiHandler('/api/lms/competition/[id]/my-pick', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();

  const id = new URL(request.url).pathname.split('/api/lms/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.lmsCompetition.findUnique({
    where: { id },
  });
  if (!competition) throw new NotFoundError('Competition not found');

  const entry = await prisma.lmsEntry.findUnique({
    where: {
      competitionId_username: {
        competitionId: id,
        username: user.username,
      },
    },
    include: {
      picks: { orderBy: { gameweek: 'asc' } },
    },
  });

  if (!entry) {
    return apiSuccess({
      entry: null,
      currentPick: null,
      history: [],
      availableTeams: [],
    });
  }

  const currentPick = entry.picks.find((p) => p.gameweek === competition.currentGameweek) ?? null;

  return apiSuccess({
    entry: {
      status: entry.status,
      usedTeams: entry.usedTeams,
      eliminatedGameweek: entry.eliminatedGameweek,
    },
    currentPick: currentPick
      ? {
          teamPicked: currentPick.teamPicked,
          isAutoPick: currentPick.isAutoPick,
          submittedAt: currentPick.submittedAt.toISOString(),
          result: currentPick.result,
        }
      : null,
    history: entry.picks
      .filter((p) => p.gameweek !== competition.currentGameweek)
      .map((p) => ({
        gameweek: p.gameweek,
        teamPicked: p.teamPicked,
        isAutoPick: p.isAutoPick,
        result: p.result,
      })),
    availableTeams: getAvailableTeams(entry.usedTeams),
  });
});
