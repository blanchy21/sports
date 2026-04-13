import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createApiHandler,
  apiSuccess,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';
import { transferMedalsFromSportsblock } from '@/lib/hive-engine/server-transfer';
import { logger } from '@/lib/logger';
import { rankEntries } from '@/lib/hol/utils';

const bodySchema = z.object({
  prizes: z.array(z.number().nonnegative()).min(1).max(10),
});

/**
 * POST /api/hol/admin/competition/[id]/payout
 * Settle the competition: snapshot final ranks, pay prizes from sportsblock
 * account. Idempotent — subsequent calls skip entries with payoutTxId set.
 */
export const POST = createApiHandler('/api/hol/admin/competition/[id]/payout', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!requireAdmin(user)) throw new ForbiddenError('Admin access required');

    const id = extractPathParam(request.url, 'competition');
    if (!id) throw new NotFoundError('Competition not found');

    const { prizes } = bodySchema.parse(await request.json());

    const competition = await prisma.holCompetition.findUnique({
      where: { id },
      include: { entries: true },
    });
    if (!competition) throw new NotFoundError('Competition not found');
    if (competition.entries.length === 0) {
      throw new ValidationError('No entries to pay out');
    }

    const alreadySnapshotted = competition.entries.some((e) => e.finalRank !== null);
    if (!alreadySnapshotted) {
      const ranked = rankEntries(
        competition.entries.map((e) => ({
          username: e.username,
          status: e.status as 'alive' | 'eliminated' | 'winner',
          buyBacksUsed: e.buyBacksUsed,
          eliminatedRound: e.eliminatedRound,
          joinedAt: e.joinedAt.toISOString(),
        }))
      );

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < ranked.length; i++) {
          const r = ranked[i];
          const entry = competition.entries.find((e) => e.username === r.username);
          if (!entry) continue;
          const prize = i < prizes.length ? prizes[i] : 0;
          await tx.holEntry.update({
            where: { id: entry.id },
            data: {
              finalRank: r.rank,
              prizeAwarded: prize,
              status: r.rank === 1 ? 'winner' : entry.status,
            },
          });
        }
        await tx.holCompetition.update({
          where: { id },
          data: { status: 'complete' },
        });
      });
      logger.info('HoL leaderboard snapshot persisted', 'hol:payout', { id });
    }

    const winners = await prisma.holEntry.findMany({
      where: { competitionId: id, prizeAwarded: { gt: 0 } },
      orderBy: { finalRank: 'asc' },
    });

    const results: Array<{
      rank: number;
      username: string;
      amount: number;
      txId: string | null;
      status: 'paid' | 'already_paid' | 'failed';
      error?: string;
    }> = [];

    for (const entry of winners) {
      if (entry.payoutTxId) {
        results.push({
          rank: entry.finalRank!,
          username: entry.username,
          amount: Number(entry.prizeAwarded!),
          txId: entry.payoutTxId,
          status: 'already_paid',
        });
        continue;
      }
      try {
        const txId = await transferMedalsFromSportsblock(
          entry.username,
          Number(entry.prizeAwarded!),
          `Higher or Lower ${competition.contestSlug} - Rank ${entry.finalRank}`
        );
        await prisma.holEntry.update({
          where: { id: entry.id },
          data: { payoutTxId: txId, paidAt: new Date() },
        });
        results.push({
          rank: entry.finalRank!,
          username: entry.username,
          amount: Number(entry.prizeAwarded!),
          txId,
          status: 'paid',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          rank: entry.finalRank!,
          username: entry.username,
          amount: Number(entry.prizeAwarded!),
          txId: null,
          status: 'failed',
          error: msg,
        });
        logger.error(`HoL payout failed for ${entry.username}: ${msg}`, 'hol:payout');
      }
    }

    return apiSuccess({ payouts: results });
  });
});
