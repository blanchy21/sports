import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { getAutoPickTeam, recalculateUsedTeams } from '@/lib/lms/utils';

/**
 * POST /api/lms/admin/competition/[id]/autopick
 * Admin only. Trigger auto-pick for alive entries missing a pick.
 */
export const POST = createApiHandler(
  '/api/lms/admin/competition/[id]/autopick',
  async (request, ctx) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

    const id = new URL(request.url).pathname.split('/api/lms/admin/competition/')[1]?.split('/')[0];
    if (!id) throw new NotFoundError('Competition not found');

    const competition = await prisma.lmsCompetition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundError('Competition not found');

    const currentGw = competition.currentGameweek;

    // Find alive entries without a pick for the current gameweek
    const entriesWithoutPick = await prisma.lmsEntry.findMany({
      where: {
        competitionId: id,
        status: 'alive',
        picks: {
          none: { gameweek: currentGw },
        },
      },
      include: {
        picks: true,
      },
    });

    if (entriesWithoutPick.length === 0) {
      return apiSuccess({ autoPickedCount: 0, autoPicks: [] });
    }

    const autoPicks: { username: string; teamPicked: string }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const entry of entriesWithoutPick) {
        const team = getAutoPickTeam(entry.usedTeams);
        if (!team) {
          ctx.log.warn('No available team for auto-pick', { username: entry.username });
          continue;
        }

        await tx.lmsPick.create({
          data: {
            competitionId: id,
            username: entry.username,
            gameweek: currentGw,
            teamPicked: team,
            isAutoPick: true,
          },
        });

        // Recalculate usedTeams
        const resolvedPicks = entry.picks
          .filter((p) => p.result !== 'pending')
          .map((p) => ({ teamPicked: p.teamPicked, result: p.result }));
        const newUsedTeams = recalculateUsedTeams(resolvedPicks, team);

        await tx.lmsEntry.update({
          where: {
            competitionId_username: { competitionId: id, username: entry.username },
          },
          data: { usedTeams: newUsedTeams },
        });

        autoPicks.push({ username: entry.username, teamPicked: team });
      }
    });

    ctx.log.info('Auto-picks completed', { count: autoPicks.length });

    return apiSuccess({
      autoPickedCount: autoPicks.length,
      autoPicks,
    });
  }
);
