import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { requireAdmin } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { transferMedalsFromSportsblock } from '@/lib/hive-engine/server-transfer';
import { logger } from '@/lib/logger';

/**
 * POST /api/ipl-bb/admin/competition/[id]/payout
 *
 * Distribute MEDALS prizes to top 3 winners. Admin only. Idempotent.
 *
 * Idempotency model:
 *  - First call for a competition snapshots the leaderboard into each entry's
 *    `finalRank` + `prizeAwarded` columns inside a transaction. Subsequent
 *    calls read this snapshot instead of recomputing from potentially-mutable
 *    match results.
 *  - Each per-entry broadcast writes `payoutTxId` + `paidAt` before the loop
 *    continues. Retries skip entries that already have a `payoutTxId`.
 *  - The `leaderboard snapshot is written before any broadcast, so a crash
 *    between broadcast and DB write leaves a short re-broadcast window on
 *    one entry only — not the entire prize pool.
 */
export const POST = createApiHandler(
  '/api/ipl-bb/admin/competition/[id]/payout',
  async (request) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();
      if (!requireAdmin(user)) throw new ForbiddenError('Admin access required');

      const id = extractPathParam(request.url, 'competition');
      if (!id) throw new NotFoundError('Competition not found');

      const competition = await prisma.iplBbCompetition.findUnique({
        where: { id },
        include: { matches: true },
      });
      if (!competition) throw new NotFoundError('Competition not found');
      if (competition.status !== 'complete') {
        throw new ValidationError('Competition must be complete before payout');
      }

      // Snapshot the leaderboard once per competition. Subsequent calls read
      // the persisted snapshot instead of recomputing — this guards against
      // admins editing `actualBoundaries` between retries and silently
      // changing the winners.
      const allEntries = await prisma.iplBbEntry.findMany({
        where: { competitionId: id },
        include: { picks: true },
      });

      const alreadySnapshotted = allEntries.some((e) => e.finalRank !== null);
      if (!alreadySnapshotted) {
        const resolvedMatches = new Map<string, number>();
        for (const match of competition.matches) {
          if (match.actualBoundaries !== null) {
            resolvedMatches.set(match.id, match.actualBoundaries);
          }
        }

        const leaderboard = allEntries
          .map((entry) => {
            let totalPoints = 0;
            let hits = 0;
            let busts = 0;
            for (const pick of entry.picks) {
              const actual = resolvedMatches.get(pick.matchId);
              if (actual === undefined) continue;
              if (pick.guess <= actual) {
                totalPoints += pick.guess;
                hits++;
              } else {
                busts++;
              }
            }
            return { id: entry.id, username: entry.username, totalPoints, hits, busts };
          })
          .sort((a, b) => b.totalPoints - a.totalPoints || a.busts - b.busts);

        if (leaderboard.length < 1) {
          throw new ValidationError('No entries to pay out');
        }

        const prizes = [competition.prizeFirst, competition.prizeSecond, competition.prizeThird];

        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < leaderboard.length; i++) {
            const entry = leaderboard[i];
            const rank = i + 1;
            const prize = rank <= 3 ? prizes[rank - 1] : null;
            await tx.iplBbEntry.update({
              where: { id: entry.id },
              data: {
                finalRank: rank,
                prizeAwarded: prize,
              },
            });
          }
        });

        logger.info(
          `IPL BB leaderboard snapshot persisted for competition ${id}`,
          'ipl-bb:payout',
          { entryCount: leaderboard.length }
        );
      }

      // Re-fetch entries after snapshot so we always read the persisted ranks.
      const winners = await prisma.iplBbEntry.findMany({
        where: {
          competitionId: id,
          finalRank: { lte: 3 },
          prizeAwarded: { gt: 0 },
        },
        orderBy: { finalRank: 'asc' },
      });

      const results: Array<{
        place: number;
        username: string;
        amount: number;
        txId: string | null;
        status: 'paid' | 'already_paid' | 'failed';
        error?: string;
      }> = [];

      for (const entry of winners) {
        if (entry.payoutTxId) {
          results.push({
            place: entry.finalRank!,
            username: entry.username,
            amount: entry.prizeAwarded!,
            txId: entry.payoutTxId,
            status: 'already_paid',
          });
          continue;
        }

        try {
          const txId = await transferMedalsFromSportsblock(
            entry.username,
            entry.prizeAwarded!,
            `IPL Boundary Blackjack ${competition.title} - ${ordinal(entry.finalRank!)} Place`
          );

          await prisma.iplBbEntry.update({
            where: { id: entry.id },
            data: { payoutTxId: txId, paidAt: new Date() },
          });

          results.push({
            place: entry.finalRank!,
            username: entry.username,
            amount: entry.prizeAwarded!,
            txId,
            status: 'paid',
          });
          logger.info(
            `IPL BB payout: ${entry.prizeAwarded} MEDALS → ${entry.username} (${ordinal(entry.finalRank!)}) tx=${txId}`,
            'ipl-bb:payout'
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({
            place: entry.finalRank!,
            username: entry.username,
            amount: entry.prizeAwarded!,
            txId: null,
            status: 'failed',
            error: msg,
          });
          logger.error(`IPL BB payout failed for ${entry.username}: ${msg}`, 'ipl-bb:payout');
        }
      }

      const top3 = winners.slice(0, 3).map((e) => ({
        rank: e.finalRank,
        username: e.username,
        prize: e.prizeAwarded,
      }));

      return apiSuccess({ payouts: results, leaderboardTop3: top3 });
    });
  }
);

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}
