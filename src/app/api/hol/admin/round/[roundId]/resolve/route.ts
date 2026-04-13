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
import { applyRoundResult, sumMatchGoals, validateRoundMatches } from '@/lib/hol/utils';
import type { HolMatch } from '@/lib/hol/types';

const matchResultSchema = z.object({
  homeGoals: z.number().int().nonnegative().nullable(),
  awayGoals: z.number().int().nonnegative().nullable(),
  postponed: z.boolean().optional(),
});

const bodySchema = z.object({
  results: z.array(matchResultSchema).length(5),
});

/**
 * POST /api/hol/admin/round/[roundId]/resolve
 * Write goals per match, compute actualTotal, apply pick results, update
 * eliminated entries, advance competition.currentRound.
 * Idempotent: re-resolving an already-resolved round is a no-op.
 */
export const POST = createApiHandler('/api/hol/admin/round/[roundId]/resolve', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!requireAdmin(user)) throw new ForbiddenError('Admin access required');

    const roundId = extractPathParam(request.url, 'round');
    if (!roundId) throw new NotFoundError('Round not found');

    const body = bodySchema.parse(await request.json());

    const round = await prisma.holRound.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found');
    if (round.status === 'resolved') {
      return apiSuccess({ alreadyResolved: true, actualTotal: round.actualTotal });
    }

    if (!validateRoundMatches(round.matches)) {
      throw new ValidationError('Round matches are malformed');
    }

    const existingMatches = round.matches as HolMatch[];
    const mergedMatches: HolMatch[] = existingMatches.map((m, i) => ({
      ...m,
      homeGoals: body.results[i].homeGoals,
      awayGoals: body.results[i].awayGoals,
      postponed: body.results[i].postponed ?? m.postponed ?? false,
    }));

    const playable = mergedMatches.filter((m) => !m.postponed);
    if (playable.length === 0) throw new ValidationError('All matches postponed — cannot resolve');
    const missing = playable.filter((m) => m.homeGoals == null || m.awayGoals == null);
    if (missing.length > 0) {
      throw new ValidationError(`${missing.length} match(es) missing goals`);
    }

    const actualTotal = sumMatchGoals(mergedMatches);
    const baselineTotal = round.baselineTotal;

    const entries = await prisma.holEntry.findMany({
      where: { competitionId: round.competitionId, status: 'alive' },
    });
    const picks = await prisma.holPick.findMany({
      where: { competitionId: round.competitionId, roundNumber: round.roundNumber },
    });

    const picksByEntryId = new Map(
      picks.map((p) => [p.entryId, { guess: p.guess as 'higher' | 'lower' }])
    );

    const diffs = applyRoundResult(
      entries.map((e) => ({
        id: e.id,
        username: e.username,
        status: e.status as 'alive' | 'eliminated' | 'winner',
      })),
      picksByEntryId,
      baselineTotal,
      actualTotal,
      round.roundNumber
    );

    await prisma.$transaction(async (tx) => {
      await tx.holRound.update({
        where: { id: roundId },
        data: {
          status: 'resolved',
          actualTotal,
          matches: mergedMatches as unknown as object[],
          resolvedAt: new Date(),
          resolvedBy: user.username,
        },
      });

      for (const diff of diffs) {
        await tx.holPick.upsert({
          where: {
            entryId_roundNumber: { entryId: diff.entryId, roundNumber: round.roundNumber },
          },
          update: { result: diff.pickResult },
          create: {
            competitionId: round.competitionId,
            entryId: diff.entryId,
            roundNumber: round.roundNumber,
            guess: 'higher', // placeholder — no pick was submitted
            result: diff.pickResult,
          },
        });

        if (diff.newStatus === 'eliminated') {
          await tx.holEntry.update({
            where: { id: diff.entryId },
            data: {
              status: 'eliminated',
              eliminatedRound: diff.eliminatedRound,
              eliminatedAt: new Date(),
            },
          });
        }
      }

      await tx.holCompetition.update({
        where: { id: round.competitionId },
        data: { currentRound: round.roundNumber + 1, status: 'active' },
      });
    });

    const aliveAfter = await prisma.holEntry.count({
      where: { competitionId: round.competitionId, status: 'alive' },
    });

    return apiSuccess({
      resolved: true,
      actualTotal,
      baselineTotal,
      eliminated: diffs.filter((d) => d.newStatus === 'eliminated').length,
      aliveAfter,
    });
  });
});
