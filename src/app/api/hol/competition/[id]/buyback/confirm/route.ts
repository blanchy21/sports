import { NextRequest } from 'next/server';
import { z } from 'zod';
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
import { consumeHolToken, verifyHolToken } from '@/lib/hol/entry-token';
import { verifyHolTransfer } from '@/lib/hol/verify-tx';
import { holBuyBackMemo } from '@/lib/hol/escrow';
import { canBuyBack } from '@/lib/hol/utils';

const bodySchema = z.object({
  buyBackToken: z.string().min(1),
  txId: z.string().min(1),
});

/**
 * POST /api/hol/competition/[id]/buyback/confirm
 * Verifies the MEDALS transfer, records the buy-back, flips entry to alive.
 * Idempotent via HolBuyBack.txId @unique.
 */
export const POST = createApiHandler(
  '/api/hol/competition/[id]/buyback/confirm',
  async (request) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();

      const id = extractPathParam(request.url, 'competition');
      if (!id) throw new NotFoundError('Competition not found');

      const { buyBackToken, txId } = bodySchema.parse(await request.json());

      const data = verifyHolToken(buyBackToken);
      if (!data) throw new ValidationError('Invalid or expired token');
      if (data.kind !== 'buyback' || !data.entryId || data.roundNumber == null) {
        throw new ValidationError('Token is not a buyback token');
      }
      if (data.competitionId !== id) throw new ValidationError('Token competition mismatch');
      if (data.username !== user.username) throw new ValidationError('Token user mismatch');

      const competition = await prisma.holCompetition.findUnique({ where: { id } });
      if (!competition) throw new NotFoundError('Competition not found');

      const entry = await prisma.holEntry.findUnique({ where: { id: data.entryId } });
      if (!entry || entry.competitionId !== id || entry.username !== user.username) {
        throw new ValidationError('Entry mismatch');
      }

      const nextRound = await prisma.holRound.findUnique({
        where: {
          competitionId_roundNumber: {
            competitionId: id,
            roundNumber: data.roundNumber,
          },
        },
      });
      const eligible = canBuyBack({
        entryStatus: entry.status as 'alive' | 'eliminated' | 'winner',
        buyBacksUsed: entry.buyBacksUsed,
        maxBuyBacks: competition.maxBuyBacks,
        nextRoundStatus:
          (nextRound?.status as 'upcoming' | 'locked' | 'resolved' | undefined) ?? null,
      });
      if (!eligible) throw new ValidationError('Not eligible to buy back');

      const verifyResult = await verifyHolTransfer({
        txId,
        expectedUsername: user.username,
        expectedAmount: data.amount,
        expectedMemo: holBuyBackMemo(id, data.entryId, data.roundNumber),
      });
      if (!verifyResult.valid) {
        throw new ValidationError(verifyResult.error || 'Transfer verification failed');
      }

      const claimed = await consumeHolToken(buyBackToken, { txId, username: user.username });
      if (!claimed) throw new ValidationError('Buy-back token has already been used');

      try {
        await prisma.$transaction([
          prisma.holBuyBack.create({
            data: {
              competitionId: id,
              entryId: entry.id,
              roundNumber: data.roundNumber,
              medalsCost: competition.buyBackCostMedals,
              txId,
            },
          }),
          prisma.holEntry.update({
            where: { id: entry.id },
            data: {
              status: 'alive',
              buyBacksUsed: { increment: 1 },
              eliminatedRound: null,
              eliminatedAt: null,
            },
          }),
        ]);
      } catch (e: unknown) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
          return apiSuccess({ success: true, alreadyProcessed: true });
        }
        throw e;
      }

      return apiSuccess({ success: true, roundNumber: data.roundNumber });
    });
  }
);
