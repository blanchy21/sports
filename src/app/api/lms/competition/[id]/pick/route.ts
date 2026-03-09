import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ValidationError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';
import { PL_TEAMS_2526 } from '@/lib/lms/teams';
import { recalculateUsedTeams } from '@/lib/lms/utils';
import type { LmsFixture } from '@/lib/lms/types';

/**
 * POST /api/lms/competition/[id]/pick
 * Auth required. Submit or update a pick for the current gameweek.
 */
export const POST = createApiHandler('/api/lms/competition/[id]/pick', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();

  const id = new URL(request.url).pathname.split('/api/lms/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const body = await request.json();
  const teamPicked = body.teamPicked as string;
  if (!teamPicked) throw new ValidationError('teamPicked is required');

  // Validate team is a valid PL team
  if (!PL_TEAMS_2526.includes(teamPicked as (typeof PL_TEAMS_2526)[number])) {
    throw new ValidationError(`Invalid team: ${teamPicked}`);
  }

  const competition = await prisma.lmsCompetition.findUnique({ where: { id } });
  if (!competition) throw new NotFoundError('Competition not found');

  // Must be in open or picking state
  if (competition.status !== 'picking' && competition.status !== 'open') {
    throw new ValidationError('Competition is not accepting picks right now');
  }

  // Check gameweek deadline
  const currentGw = await prisma.lmsGameweek.findUnique({
    where: {
      competitionId_gameweek: {
        competitionId: id,
        gameweek: competition.currentGameweek,
      },
    },
  });
  if (!currentGw) throw new ValidationError('Current gameweek not found');
  if (new Date() >= currentGw.deadline) {
    throw new ValidationError('Pick deadline has passed');
  }

  // Check user is alive
  const entry = await prisma.lmsEntry.findUnique({
    where: {
      competitionId_username: {
        competitionId: id,
        username: user.username,
      },
    },
    include: {
      picks: true,
    },
  });
  if (!entry) throw new ValidationError('You are not entered in this competition');
  if (entry.status !== 'alive') throw new ValidationError('You have been eliminated');

  // Check team not already used (excluding current gameweek's pick if changing)
  const resolvedPicks = entry.picks.filter(
    (p) => p.gameweek !== competition.currentGameweek && p.result !== 'pending'
  );
  const wouldUse = recalculateUsedTeams(
    resolvedPicks.map((p) => ({ teamPicked: p.teamPicked, result: p.result })),
    teamPicked
  );
  const alreadyUsed = entry.picks.find(
    (p) =>
      p.teamPicked === teamPicked &&
      p.gameweek !== competition.currentGameweek &&
      p.result !== 'postponed'
  );
  if (alreadyUsed) {
    throw new ValidationError(`You have already used ${teamPicked}`);
  }

  // Check team has a fixture this gameweek
  const fixtures = (currentGw.fixtures as unknown as LmsFixture[]) || [];
  const hasFixture = fixtures.some((f) => f.homeTeam === teamPicked || f.awayTeam === teamPicked);
  if (!hasFixture) {
    throw new ValidationError(`${teamPicked} does not have a fixture this gameweek`);
  }

  // Upsert the pick
  const pick = await prisma.lmsPick.upsert({
    where: {
      competitionId_username_gameweek: {
        competitionId: id,
        username: user.username,
        gameweek: competition.currentGameweek,
      },
    },
    create: {
      competitionId: id,
      username: user.username,
      gameweek: competition.currentGameweek,
      teamPicked,
      isAutoPick: false,
    },
    update: {
      teamPicked,
      isAutoPick: false,
      submittedAt: new Date(),
    },
  });

  // Recalculate usedTeams on the entry
  await prisma.lmsEntry.update({
    where: {
      competitionId_username: {
        competitionId: id,
        username: user.username,
      },
    },
    data: { usedTeams: wouldUse },
  });

  return apiSuccess({
    gameweek: pick.gameweek,
    teamPicked: pick.teamPicked,
    isAutoPick: pick.isAutoPick,
    submittedAt: pick.submittedAt.toISOString(),
  });
});
