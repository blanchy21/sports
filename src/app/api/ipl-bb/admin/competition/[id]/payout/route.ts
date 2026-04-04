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
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { transferCurationMedals } from '@/lib/curation/transfer';
import { logger } from '@/lib/logger';

/**
 * POST /api/ipl-bb/admin/competition/[id]/payout
 * Distribute MEDALS prizes to top 3 winners. Admin only.
 *
 * Reads prize_first/prize_second/prize_third from the competition,
 * fetches the leaderboard, and broadcasts transfers from @sportsblock.
 */
export const POST = createApiHandler(
  '/api/ipl-bb/admin/competition/[id]/payout',
  async (request) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();
      if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

      const id = extractPathParam(request.url, 'competition');
      if (!id) throw new NotFoundError('Competition not found');

      const competition = await prisma.iplBbCompetition.findUnique({
        where: { id },
        include: {
          matches: true,
        },
      });
      if (!competition) throw new NotFoundError('Competition not found');
      if (competition.status !== 'complete') {
        throw new ValidationError('Competition must be complete before payout');
      }

      // Get all entries with their picks
      const entries = await prisma.iplBbEntry.findMany({
        where: { competitionId: id },
        include: {
          picks: true,
        },
      });

      // Build resolved match map: matchId -> actual boundaries
      const resolvedMatches = new Map<string, number>();
      for (const match of competition.matches) {
        if (match.actualBoundaries !== null) {
          resolvedMatches.set(match.id, match.actualBoundaries);
        }
      }

      // Calculate scores per entry (same logic as leaderboard)
      const leaderboard = entries
        .map((entry) => {
          let totalPoints = 0;
          let hits = 0;
          let busts = 0;

          for (const pick of entry.picks) {
            const actual = resolvedMatches.get(pick.matchId);
            if (actual === undefined) continue; // match not resolved

            if (pick.guess <= actual) {
              totalPoints += pick.guess;
              hits++;
            } else {
              busts++;
            }
          }

          return {
            username: entry.username,
            totalPoints,
            hits,
            busts,
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints || a.busts - b.busts);

      if (leaderboard.length < 1) {
        throw new ValidationError('No entries to pay out');
      }

      // Prize amounts from competition config
      const prizes = [
        { place: 1, amount: competition.prizeFirst, username: leaderboard[0]?.username },
        { place: 2, amount: competition.prizeSecond, username: leaderboard[1]?.username },
        { place: 3, amount: competition.prizeThird, username: leaderboard[2]?.username },
      ].filter((p) => p.username);

      const results: Array<{
        place: number;
        username: string;
        amount: number;
        txId: string | null;
        error?: string;
      }> = [];

      for (const prize of prizes) {
        try {
          const txId = await transferCurationMedals(
            prize.username!,
            prize.amount,
            `IPL Boundary Blackjack ${competition.title} - ${ordinal(prize.place)} Place`
          );
          results.push({
            place: prize.place,
            username: prize.username!,
            amount: prize.amount,
            txId,
          });
          logger.info(
            `IPL BB payout: ${prize.amount} MEDALS → ${prize.username} (${ordinal(prize.place)}) tx=${txId}`,
            'ipl-bb:payout'
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({
            place: prize.place,
            username: prize.username!,
            amount: prize.amount,
            txId: null,
            error: msg,
          });
          logger.error(`IPL BB payout failed for ${prize.username}: ${msg}`, 'ipl-bb:payout');
        }
      }

      return apiSuccess({ payouts: results, leaderboardTop3: leaderboard.slice(0, 3) });
    });
  }
);

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}
