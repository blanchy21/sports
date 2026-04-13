import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createApiHandler,
  apiSuccess,
  AuthError,
  ForbiddenError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { serializeCompetition, serializeRound } from '@/lib/hol/serialize';
import { validateRoundMatches, sumMatchGoals } from '@/lib/hol/utils';

const matchSchema = z.object({
  league: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  kickoff: z.string().min(1),
  homeGoals: z.number().int().nonnegative().optional(),
  awayGoals: z.number().int().nonnegative().optional(),
  postponed: z.boolean().optional(),
});

const bodySchema = z.object({
  title: z.string().min(3),
  contestSlug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/),
  totalRoundsPlanned: z.number().int().min(3).max(30),
  buyBackCostMedals: z.number().nonnegative(),
  maxBuyBacks: z.number().int().min(0).max(10).default(2),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().optional(),
  seedMatches: z.array(matchSchema).length(5),
  seedBaseline: z.number().int().nonnegative().optional(),
  round1Deadline: z.string().min(1),
  round1Matches: z.array(matchSchema).length(5),
});

/**
 * POST /api/hol/admin/competitions
 * Create competition + round 1. Seed baseline is either the explicit
 * seedBaseline number or computed from the 5 seedMatches' goals.
 */
export const POST = createApiHandler('/api/hol/admin/competitions', async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!requireAdmin(user)) throw new ForbiddenError('Admin access required');

    const body = bodySchema.parse(await request.json());

    if (!validateRoundMatches(body.seedMatches) || !validateRoundMatches(body.round1Matches)) {
      throw new ValidationError('Matches must have league, homeTeam, awayTeam, kickoff');
    }

    const seedBaseline =
      body.seedBaseline ??
      sumMatchGoals(
        body.seedMatches.map((m) => ({
          ...m,
          homeGoals: m.homeGoals ?? null,
          awayGoals: m.awayGoals ?? null,
        }))
      );

    const existing = await prisma.holCompetition.findUnique({
      where: { contestSlug: body.contestSlug },
    });
    if (existing) throw new ValidationError('contestSlug already exists');

    const competition = await prisma.$transaction(async (tx) => {
      const comp = await tx.holCompetition.create({
        data: {
          contestSlug: body.contestSlug,
          status: 'upcoming',
          currentRound: 1,
          totalRoundsPlanned: body.totalRoundsPlanned,
          buyBackCostMedals: body.buyBackCostMedals,
          maxBuyBacks: body.maxBuyBacks,
          tieRule: 'survive',
          startsAt: new Date(body.startsAt),
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
        },
      });

      await tx.holRound.create({
        data: {
          competitionId: comp.id,
          roundNumber: 1,
          status: 'upcoming',
          deadline: new Date(body.round1Deadline),
          baselineTotal: seedBaseline,
          matches: body.round1Matches,
        },
      });

      return comp;
    });

    const withRounds = await prisma.holCompetition.findUnique({
      where: { id: competition.id },
      include: { rounds: true },
    });

    return apiSuccess({
      competition: serializeCompetition(withRounds!),
      rounds: withRounds!.rounds.map(serializeRound),
    });
  });
});
