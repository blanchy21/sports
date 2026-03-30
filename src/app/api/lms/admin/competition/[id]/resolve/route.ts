import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { resolvePickResult, recalculateUsedTeams } from '@/lib/lms/utils';
import type { LmsFixture } from '@/lib/lms/types';
import { z } from 'zod';

const resolveSchema = z.object({
  gameweek: z.number().int().min(1),
  results: z
    .array(
      z.object({
        homeTeam: z.string(),
        awayTeam: z.string(),
        homeGoals: z.number().int().min(0),
        awayGoals: z.number().int().min(0),
        postponed: z.boolean(),
      })
    )
    .min(1, 'results must contain at least one match'),
});

/**
 * POST /api/lms/admin/competition/[id]/resolve
 * Admin only. Enter results and resolve a gameweek.
 */
export const POST = createApiHandler(
  '/api/lms/admin/competition/[id]/resolve',
  async (request, ctx) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();
      if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

      const id = extractPathParam(request.url, 'competition');
      if (!id) throw new NotFoundError('Competition not found');

      const { gameweek, results } = resolveSchema.parse(await request.json());

      const competition = await prisma.lmsCompetition.findUnique({ where: { id } });
      if (!competition) throw new NotFoundError('Competition not found');

      const gw = await prisma.lmsGameweek.findUnique({
        where: { competitionId_gameweek: { competitionId: id, gameweek } },
      });
      if (!gw) throw new NotFoundError('Gameweek not found');

      // Build fixture list with results
      const fixtures: LmsFixture[] = results.map((r) => ({
        homeTeam: r.homeTeam,
        awayTeam: r.awayTeam,
        kickoff: '', // preserved from existing or empty
        homeGoals: r.postponed ? null : r.homeGoals,
        awayGoals: r.postponed ? null : r.awayGoals,
        postponed: r.postponed,
      }));

      // Merge kickoff times from existing fixtures if available
      const existingFixtures = (gw.fixtures as unknown as LmsFixture[]) || [];
      for (const fixture of fixtures) {
        const existing = existingFixtures.find(
          (f) => f.homeTeam === fixture.homeTeam && f.awayTeam === fixture.awayTeam
        );
        if (existing?.kickoff) fixture.kickoff = existing.kickoff;
      }

      // Get all alive entries with their picks for this gameweek
      const entries = await prisma.lmsEntry.findMany({
        where: { competitionId: id, status: 'alive' },
        include: {
          picks: {
            where: { gameweek },
          },
        },
      });

      let survivorsCount = 0;
      let eliminatedCount = 0;

      // Resolve each pick in a transaction
      await prisma.$transaction(async (tx) => {
        for (const entry of entries) {
          const pick = entry.picks[0];
          if (!pick) {
            // No pick = eliminated (auto-pick should have been run before)
            eliminatedCount++;
            await tx.lmsEntry.update({
              where: { competitionId_username: { competitionId: id, username: entry.username } },
              data: { status: 'eliminated', eliminatedGameweek: gameweek },
            });
            continue;
          }

          const result = resolvePickResult(pick.teamPicked, fixtures);

          // Update pick result
          await tx.lmsPick.update({
            where: { id: pick.id },
            data: {
              result,
              resolvedAt: new Date(),
              resolvedBy: user.username,
            },
          });

          if (result === 'eliminated') {
            eliminatedCount++;
            await tx.lmsEntry.update({
              where: { competitionId_username: { competitionId: id, username: entry.username } },
              data: {
                status: 'eliminated',
                eliminatedGameweek: gameweek,
                eliminatedByTeam: pick.teamPicked,
              },
            });
          } else {
            survivorsCount++;

            if (result === 'postponed') {
              // Postponed: survived, but remove team from usedTeams
              const allPicks = await tx.lmsPick.findMany({
                where: { competitionId: id, username: entry.username },
              });
              const resolvedPicks = allPicks
                .filter((p) => p.result !== 'pending' && p.gameweek !== gameweek)
                .map((p) => ({ teamPicked: p.teamPicked, result: p.result }));

              // Postponed pick's team gets freed — pass null as currentPick
              const newUsedTeams = recalculateUsedTeams(resolvedPicks, null);

              await tx.lmsEntry.update({
                where: { competitionId_username: { competitionId: id, username: entry.username } },
                data: { usedTeams: newUsedTeams },
              });
            }
          }
        }

        // Update gameweek
        await tx.lmsGameweek.update({
          where: { competitionId_gameweek: { competitionId: id, gameweek } },
          data: {
            fixtures: JSON.parse(JSON.stringify(fixtures)),
            status: 'complete',
            survivorsCount,
            eliminatedCount,
          },
        });

        // Check win conditions
        if (survivorsCount === 0) {
          // Everyone eliminated — shared prize (mark competition complete)
          await tx.lmsCompetition.update({
            where: { id },
            data: { status: 'complete', completedAt: new Date() },
          });
          ctx.log.info('All players eliminated — shared result', { gameweek });
        } else if (survivorsCount === 1) {
          // Single winner
          const winner = entries.find((e) => {
            const pick = e.picks[0];
            if (!pick) return false;
            return resolvePickResult(pick.teamPicked, fixtures) !== 'eliminated';
          });
          if (winner) {
            await tx.lmsEntry.update({
              where: {
                competitionId_username: { competitionId: id, username: winner.username },
              },
              data: { status: 'winner' },
            });
            await tx.lmsCompetition.update({
              where: { id },
              data: {
                status: 'complete',
                winnerUsername: winner.username,
                completedAt: new Date(),
              },
            });
            ctx.log.info('Winner determined', { winner: winner.username, gameweek });
          }
        }
      });

      return apiSuccess({
        gameweek,
        survivorsCount,
        eliminatedCount,
        totalEntries: entries.length,
      });
    });
  }
);
