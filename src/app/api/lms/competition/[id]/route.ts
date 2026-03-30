import { createApiHandler, apiSuccess, NotFoundError } from '@/lib/api/response';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/lms/competition/[id]
 * Competition detail + all gameweeks. Public.
 */
export const GET = createApiHandler('/api/lms/competition/[id]', async (request) => {
  const id = extractPathParam(request.url, 'competition');
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.lmsCompetition.findUnique({
    where: { id },
    include: {
      gameweeks: { orderBy: { gameweek: 'asc' } },
      _count: { select: { entries: { where: { status: 'alive' } } } },
    },
  });

  if (!competition) throw new NotFoundError('Competition not found');

  const currentGw = competition.gameweeks.find((gw) => gw.gameweek === competition.currentGameweek);

  return apiSuccess({
    id: competition.id,
    name: competition.name,
    season: competition.season,
    status: competition.status,
    currentGameweek: competition.currentGameweek,
    startGameweek: competition.startGameweek,
    isFreeEntry: competition.isFreeEntry,
    entryFeeMedals: competition.entryFeeMedals,
    prizeHive: competition.prizeHive,
    prizeMedals: competition.prizeMedals,
    totalEntries: competition.totalEntries,
    registrationDeadline: competition.registrationDeadline?.toISOString() ?? null,
    winnerUsername: competition.winnerUsername,
    completedAt: competition.completedAt?.toISOString() ?? null,
    aliveCount: competition._count.entries,
    currentGameweekData: currentGw
      ? {
          gameweek: currentGw.gameweek,
          deadline: currentGw.deadline.toISOString(),
          status: currentGw.status,
          survivorsCount: currentGw.survivorsCount,
          eliminatedCount: currentGw.eliminatedCount,
          fixtures: currentGw.fixtures,
        }
      : undefined,
    gameweeks: competition.gameweeks.map((gw) => ({
      gameweek: gw.gameweek,
      deadline: gw.deadline.toISOString(),
      status: gw.status,
      survivorsCount: gw.survivorsCount,
      eliminatedCount: gw.eliminatedCount,
      fixtures: gw.fixtures,
    })),
  });
});
