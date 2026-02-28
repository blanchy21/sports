import {
  createApiHandler,
  apiSuccess,
  AuthError,
  ValidationError,
  ForbiddenError,
  RateLimitError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';
import { prisma } from '@/lib/db/prisma';
import { PredictionStatus } from '@/generated/prisma/client';
import { serializePrediction } from '@/lib/predictions/serialize';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const listSchema = z.object({
  status: z.nativeEnum(PredictionStatus).optional(),
  sport: z.string().optional(),
  creator: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = createApiHandler('/api/predictions', async (request, _ctx) => {
  const url = new URL(request.url);
  const params = listSchema.parse({
    status: url.searchParams.get('status') ?? undefined,
    sport: url.searchParams.get('sport') ?? undefined,
    creator: url.searchParams.get('creator') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? 20,
  });

  const user = await getAuthenticatedUserFromSession(request as NextRequest).catch(() => null);

  // Sort by locksAt ASC for open/all (soonest fixture first), createdAt DESC for settled
  const sortByLocksAt = params.status !== 'SETTLED';

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.sport) where.sportCategory = params.sport;
  if (params.creator) where.creatorUsername = params.creator;
  if (params.cursor) {
    if (sortByLocksAt) {
      where.locksAt = { gt: new Date(params.cursor) };
    } else {
      where.createdAt = { lt: new Date(params.cursor) };
    }
  }

  const predictions = await prisma.prediction.findMany({
    where,
    include: {
      outcomes: true,
      stakes: true,
    },
    orderBy: sortByLocksAt ? { locksAt: 'asc' } : { createdAt: 'desc' },
    take: params.limit + 1,
  });

  const hasMore = predictions.length > params.limit;
  const items = hasMore ? predictions.slice(0, params.limit) : predictions;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? (sortByLocksAt ? lastItem.locksAt : lastItem.createdAt).toISOString()
      : null;

  const serialized = items.map((p) => serializePrediction(p, user?.username));

  return apiSuccess({ predictions: serialized, nextCursor });
});

const createSchema = z.object({
  title: z.string().min(1).max(PREDICTION_CONFIG.MAX_TITLE_LENGTH),
  outcomes: z
    .array(z.string().min(1).max(PREDICTION_CONFIG.MAX_OUTCOME_LABEL_LENGTH))
    .min(PREDICTION_CONFIG.MIN_OUTCOMES)
    .max(PREDICTION_CONFIG.MAX_OUTCOMES),
  sportCategory: z.string().optional(),
  matchReference: z.string().optional(),
  locksAt: z.string().datetime(),
  creatorStake: z.object({
    outcomeIndex: z.number().int().min(0),
    amount: z.number().min(PREDICTION_CONFIG.MIN_CREATOR_STAKE).max(PREDICTION_CONFIG.MAX_STAKE),
  }),
});

export const POST = createApiHandler('/api/predictions', async (request, _ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (user.authType !== 'hive') {
      throw new ForbiddenError('Only Hive wallet users can create predictions');
    }

    const body = createSchema.parse(await request.json());

    if (body.creatorStake.outcomeIndex >= body.outcomes.length) {
      throw new ValidationError('creatorStake.outcomeIndex is out of range');
    }

    const locksAt = new Date(body.locksAt);
    const now = Date.now();
    const lockDelta = locksAt.getTime() - now;

    if (lockDelta < PREDICTION_CONFIG.MIN_LOCK_TIME_MS) {
      throw new ValidationError(
        `Lock time must be at least ${PREDICTION_CONFIG.MIN_LOCK_TIME_MS / 60000} minutes in the future`
      );
    }
    if (lockDelta > PREDICTION_CONFIG.MAX_LOCK_TIME_MS) {
      throw new ValidationError(
        `Lock time must be at most ${PREDICTION_CONFIG.MAX_LOCK_TIME_MS / (24 * 60 * 60 * 1000)} days in the future`
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await prisma.prediction.count({
      where: {
        creatorUsername: user.username,
        createdAt: { gte: startOfDay },
      },
    });
    if (todayCount >= PREDICTION_CONFIG.MAX_PREDICTIONS_PER_DAY) {
      throw new RateLimitError(
        `Maximum ${PREDICTION_CONFIG.MAX_PREDICTIONS_PER_DAY} predictions per day`
      );
    }

    const prediction = await prisma.$transaction(async (tx) => {
      const created = await tx.prediction.create({
        data: {
          creatorUsername: user.username,
          title: body.title,
          sportCategory: body.sportCategory ?? null,
          matchReference: body.matchReference ?? null,
          locksAt,
          status: 'OPEN',
          outcomes: {
            create: body.outcomes.map((label) => ({ label })),
          },
        },
        include: {
          outcomes: true,
          stakes: true,
        },
      });
      return created;
    });

    return apiSuccess(
      { prediction: serializePrediction(prediction, user.username), stakeRequired: true },
      { status: 201 }
    );
  });
});
