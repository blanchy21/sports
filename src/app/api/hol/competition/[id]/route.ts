import { createApiHandler, apiSuccess, NotFoundError } from '@/lib/api/response';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';
import {
  serializeCompetition,
  serializeEntry,
  serializePick,
  serializeRound,
} from '@/lib/hol/serialize';
import { rankEntries } from '@/lib/hol/utils';

/**
 * GET /api/hol/competition/[id]
 * Full competition detail: rounds + entries + picks + leaderboard.
 */
export const GET = createApiHandler('/api/hol/competition/[id]', async (request) => {
  const id = extractPathParam(request.url, 'competition');
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.holCompetition.findUnique({
    where: { id },
    include: {
      rounds: { orderBy: { roundNumber: 'asc' } },
      entries: true,
      picks: { orderBy: { submittedAt: 'asc' } },
    },
  });
  if (!competition) throw new NotFoundError('Competition not found');

  const leaderboard = rankEntries(
    competition.entries.map((e) => ({
      username: e.username,
      status: e.status as 'alive' | 'eliminated' | 'winner',
      buyBacksUsed: e.buyBacksUsed,
      eliminatedRound: e.eliminatedRound,
      joinedAt: e.joinedAt.toISOString(),
    }))
  );

  return apiSuccess({
    competition: serializeCompetition(competition),
    rounds: competition.rounds.map(serializeRound),
    entries: competition.entries.map(serializeEntry),
    picks: competition.picks.map(serializePick),
    leaderboard,
  });
});
