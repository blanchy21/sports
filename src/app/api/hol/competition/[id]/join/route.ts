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
import { buildHolEntryFeeOp, holEntryMemo } from '@/lib/hol/escrow';
import { signHolToken } from '@/lib/hol/entry-token';

/**
 * POST /api/hol/competition/[id]/join
 * Initiate paid entry. Returns the custom_json op for the wallet to broadcast
 * plus a signed token the client sends to /join/confirm with the txId.
 */
export const POST = createApiHandler('/api/hol/competition/[id]/join', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    const id = extractPathParam(request.url, 'competition');
    if (!id) throw new NotFoundError('Competition not found');

    const competition = await prisma.holCompetition.findUnique({
      where: { id },
      include: { rounds: { where: { roundNumber: 1 }, take: 1 } },
    });
    if (!competition) throw new NotFoundError('Competition not found');
    if (!['upcoming', 'active'].includes(competition.status)) {
      throw new ValidationError('Competition is not accepting entries');
    }

    const existing = await prisma.holEntry.findUnique({
      where: { competitionId_username: { competitionId: id, username: user.username } },
    });
    if (existing) throw new ValidationError('You have already entered this competition');

    const round1 = competition.rounds[0];
    if (round1 && new Date() >= round1.deadline) {
      throw new ValidationError('Registration has closed');
    }

    const contest = await prisma.contest.findUnique({ where: { slug: competition.contestSlug } });
    const entryFee = contest ? Number(contest.entryFee) : 0;

    if (entryFee === 0) {
      const entry = await prisma.holEntry.create({
        data: { competitionId: id, username: user.username },
      });
      return apiSuccess({
        operation: null,
        entryToken: null,
        entryFee: 0,
        entryId: entry.id,
        confirmed: true,
      });
    }

    const operation = buildHolEntryFeeOp(user.username, entryFee, id);
    const entryToken = signHolToken({
      competitionId: id,
      username: user.username,
      amount: entryFee,
      kind: 'entry',
    });

    return apiSuccess({
      operation,
      entryToken,
      entryFee,
      expectedMemo: holEntryMemo(id),
      confirmed: false,
    });
  });
});
