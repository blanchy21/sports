import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  AuthError,
  NotFoundError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';
import { buildHolBuyBackOp, holBuyBackMemo } from '@/lib/hol/escrow';
import { signHolToken } from '@/lib/hol/entry-token';
import { canBuyBack } from '@/lib/hol/utils';

/**
 * POST /api/hol/competition/[id]/buyback
 * Initiate a buy-back: returns the signed transfer op for MEDALS cost.
 * Client broadcasts, then posts txId to /buyback/confirm.
 */
export const POST = createApiHandler('/api/hol/competition/[id]/buyback', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    const id = extractPathParam(request.url, 'competition');
    if (!id) throw new NotFoundError('Competition not found');

    const competition = await prisma.holCompetition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundError('Competition not found');

    const entry = await prisma.holEntry.findUnique({
      where: { competitionId_username: { competitionId: id, username: user.username } },
    });
    if (!entry) throw new ValidationError('You have not entered this competition');

    const nextRound = await prisma.holRound.findFirst({
      where: { competitionId: id, status: 'upcoming' },
      orderBy: { roundNumber: 'asc' },
    });
    if (!nextRound) throw new ValidationError('No upcoming round to buy back into');

    const eligible = canBuyBack({
      entryStatus: entry.status as 'alive' | 'eliminated' | 'winner',
      buyBacksUsed: entry.buyBacksUsed,
      maxBuyBacks: competition.maxBuyBacks,
      nextRoundStatus: 'upcoming',
    });
    if (!eligible) throw new ValidationError('Not eligible to buy back (status or cap)');

    const amount = Number(competition.buyBackCostMedals);
    const operation = buildHolBuyBackOp(user.username, amount, id, entry.id, nextRound.roundNumber);
    const buyBackToken = signHolToken({
      competitionId: id,
      username: user.username,
      amount,
      kind: 'buyback',
      entryId: entry.id,
      roundNumber: nextRound.roundNumber,
    });

    return apiSuccess({
      operation,
      buyBackToken,
      amount,
      expectedMemo: holBuyBackMemo(id, entry.id, nextRound.roundNumber),
      roundNumber: nextRound.roundNumber,
    });
  });
});
