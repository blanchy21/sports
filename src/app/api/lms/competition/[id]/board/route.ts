import { createApiHandler, apiSuccess, NotFoundError } from '@/lib/api/response';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/lms/competition/[id]/board
 * Survival board. Public. Picks hidden before deadline.
 */
export const GET = createApiHandler('/api/lms/competition/[id]/board', async (request) => {
  const id = extractPathParam(request.url, 'competition');
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.lmsCompetition.findUnique({
    where: { id },
  });

  if (!competition) throw new NotFoundError('Competition not found');

  // Get current gameweek to check deadline
  const currentGw = await prisma.lmsGameweek.findUnique({
    where: {
      competitionId_gameweek: {
        competitionId: id,
        gameweek: competition.currentGameweek,
      },
    },
  });

  const now = new Date();
  const isBeforeDeadline = currentGw ? now < currentGw.deadline : false;

  // Fetch all entries with their latest pick
  const entries = await prisma.lmsEntry.findMany({
    where: { competitionId: id },
    include: {
      picks: {
        orderBy: { gameweek: 'desc' },
      },
    },
    orderBy: [
      // alive first, then by elimination (latest eliminated first)
      { status: 'asc' }, // alive < eliminated < winner (alphabetical)
    ],
  });

  const board = entries.map((entry) => {
    const currentPick = entry.picks.find((p) => p.gameweek === competition.currentGameweek);
    const lastResolvedPick = entry.picks.find(
      (p) => p.gameweek !== competition.currentGameweek && p.result !== 'pending'
    );

    return {
      username: entry.username,
      status: entry.status,
      eliminatedGameweek: entry.eliminatedGameweek,
      gameweeksSurvived: entry.picks.filter(
        (p) => p.result === 'survived' || p.result === 'postponed'
      ).length,
      // Hide current pick before deadline, but indicate if they've picked
      currentPick: isBeforeDeadline ? null : (currentPick?.teamPicked ?? null),
      hasPicked: !!currentPick,
      lastPick: lastResolvedPick
        ? {
            team: lastResolvedPick.teamPicked,
            result: lastResolvedPick.result,
            gameweek: lastResolvedPick.gameweek,
          }
        : null,
    };
  });

  // Sort: alive first, then winners, then eliminated (latest eliminated first)
  board.sort((a, b) => {
    const statusOrder = { alive: 0, winner: 1, eliminated: 2 };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    // Within eliminated, latest eliminated first
    if (a.status === 'eliminated' && b.status === 'eliminated') {
      return (b.eliminatedGameweek ?? 0) - (a.eliminatedGameweek ?? 0);
    }
    return a.username.localeCompare(b.username);
  });

  return apiSuccess(board);
});
