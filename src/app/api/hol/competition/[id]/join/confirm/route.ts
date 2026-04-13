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
import { holEntryMemo } from '@/lib/hol/escrow';

const bodySchema = z.object({
  entryToken: z.string().min(1),
  txId: z.string().min(1),
});

/**
 * POST /api/hol/competition/[id]/join/confirm
 * Verifies the MEDALS transfer matches the signed token, then creates the entry.
 * Idempotent via Redis token consumption + unique (competitionId, username).
 */
export const POST = createApiHandler('/api/hol/competition/[id]/join/confirm', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    const id = extractPathParam(request.url, 'competition');
    if (!id) throw new NotFoundError('Competition not found');

    const { entryToken, txId } = bodySchema.parse(await request.json());

    const data = verifyHolToken(entryToken);
    if (!data) throw new ValidationError('Invalid or expired entry token');
    if (data.kind !== 'entry') throw new ValidationError('Token is not an entry token');
    if (data.competitionId !== id) throw new ValidationError('Token competition mismatch');
    if (data.username !== user.username) throw new ValidationError('Token user mismatch');

    const verifyResult = await verifyHolTransfer({
      txId,
      expectedUsername: user.username,
      expectedAmount: data.amount,
      expectedMemo: holEntryMemo(id),
    });
    if (!verifyResult.valid) {
      throw new ValidationError(verifyResult.error || 'Transfer verification failed');
    }

    const claimed = await consumeHolToken(entryToken, { txId, username: user.username });
    if (!claimed) throw new ValidationError('Entry token has already been used');

    try {
      const entry = await prisma.holEntry.create({
        data: { competitionId: id, username: user.username },
      });
      return apiSuccess({ entryId: entry.id, confirmed: true });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        return apiSuccess({ confirmed: true, alreadyEntered: true });
      }
      throw e;
    }
  });
});
