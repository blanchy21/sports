/**
 * POST /api/contests/[slug]/enter/confirm — Confirm entry after broadcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { AuthError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import {
  verifyEntryToken,
  isEntryTokenConsumed,
  consumeEntryToken,
} from '@/lib/contests/entry-token';
import { serializeEntry } from '@/lib/contests/serialize';
import { PRIZE_MODELS } from '@/lib/contests/constants';

export const POST = createApiHandler('/api/contests/[slug]/enter/confirm', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError('Authentication required');

    const body = await request.json();
    const { entryToken, txId, entryData } = body;

    if (!entryToken || !txId) {
      throw new ValidationError('entryToken and txId are required');
    }

    // Verify token
    const tokenData = verifyEntryToken(entryToken);
    if (!tokenData) {
      throw new ValidationError('Invalid or expired entry token');
    }

    // Verify token belongs to this user
    if (tokenData.username !== user.username) {
      throw new ValidationError('Entry token does not match authenticated user');
    }

    // One-time use check via Redis
    const consumed = await isEntryTokenConsumed(entryToken);
    if (consumed) {
      throw new ValidationError('Entry token has already been used');
    }

    // Create entry in a transaction
    const entry = await prisma.$transaction(async (tx) => {
      // Double-check contest is still open and user hasn't entered
      const contest = await tx.contest.findUnique({
        where: { id: tokenData.contestId },
      });

      if (!contest || contest.status !== 'REGISTRATION') {
        throw new ValidationError('Contest is no longer open for registration');
      }

      if (contest.maxEntries && contest.entryCount >= contest.maxEntries) {
        throw new ValidationError('Contest is full');
      }

      // Create the entry
      const newEntry = await tx.contestEntry.create({
        data: {
          contestId: tokenData.contestId,
          username: user.username,
          entryData: entryData || {},
          entryFeeTxId: txId,
        },
      });

      // Increment entry count; only increment prizePool for FEE_FUNDED
      // (FIXED model keeps prizePool at the value set at creation)
      await tx.contest.update({
        where: { id: tokenData.contestId },
        data: {
          entryCount: { increment: 1 },
          ...(contest.prizeModel !== PRIZE_MODELS.FIXED && {
            prizePool: { increment: tokenData.amount },
          }),
        },
      });

      // Record in escrow ledger
      await tx.contestEscrowLedger.create({
        data: {
          contestId: tokenData.contestId,
          entryType: 'entry_fee',
          username: user.username,
          amount: tokenData.amount,
          txId,
        },
      });

      return newEntry;
    });

    // Mark token as consumed (after successful DB write)
    await consumeEntryToken(entryToken, { txId, username: user.username });

    ctx.log.info('Contest entry confirmed', {
      contestId: tokenData.contestId,
      username: user.username,
      txId,
      entryId: entry.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeEntry(entry),
      },
      { status: 201 }
    );
  });
});
