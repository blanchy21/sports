import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';
import { prisma } from '@/lib/db/prisma';
import { serializePrediction, decimalToNumber } from '@/lib/predictions/serialize';
import { buildRefundOps } from '@/lib/predictions/escrow';
import { broadcastHiveEngineOps } from '@/lib/predictions/settlement';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { NextRequest } from 'next/server';
import { z } from 'zod';

function extractId(url: string): string {
  return new URL(url).pathname.split('/predictions/')[1]?.split('/')[0] ?? '';
}

export const GET = createApiHandler('/api/predictions/[id]', async (request, _ctx) => {
  const id = extractId(request.url);

  const prediction = await prisma.prediction.findUnique({
    where: { id },
    include: {
      outcomes: true,
      stakes: true,
    },
  });

  if (!prediction) throw new NotFoundError('Prediction not found');

  const user = await getAuthenticatedUserFromSession(request as NextRequest).catch(() => null);

  return apiSuccess(serializePrediction(prediction, user?.username));
});

export const DELETE = createApiHandler('/api/predictions/[id]', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    const id = extractId(request.url);

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { stakes: true },
    });

    if (!prediction) throw new NotFoundError('Prediction not found');

    if (prediction.creatorUsername !== user.username) {
      throw new ForbiddenError('Only the creator can delete this prediction');
    }

    if (prediction.status !== 'OPEN') {
      throw new ValidationError('Can only delete OPEN predictions');
    }

    const nonCreatorStakes = prediction.stakes.filter(
      (s) => s.username !== prediction.creatorUsername
    );
    if (nonCreatorStakes.length > 0) {
      throw new ForbiddenError('Cannot delete a prediction that other users have staked on');
    }

    // If creator has stakes, refund them on-chain first
    const creatorStakes = prediction.stakes.filter(
      (s) => s.username === prediction.creatorUsername
    );
    if (creatorStakes.length > 0) {
      const refunds = creatorStakes.map((s) => ({
        username: s.username,
        amount: decimalToNumber(s.amount),
        predictionId: prediction.id,
      }));
      const refundOps = buildRefundOps(refunds);
      if (refundOps.length > 0) {
        await broadcastHiveEngineOps(refundOps);
        ctx.log.info('Creator stakes refunded on-chain', { predictionId: id });
      }
    }

    // Hard-delete — Prisma cascade handles outcomes, stakes, escrow ledger
    await prisma.prediction.delete({ where: { id } });

    ctx.log.info('Prediction deleted', { predictionId: id, username: user.username });

    return apiSuccess({ deleted: true });
  });
});

const patchSchema = z.object({
  title: z.string().min(1).max(PREDICTION_CONFIG.MAX_TITLE_LENGTH).optional(),
  outcomes: z
    .array(
      z.object({
        id: z.string().uuid(),
        label: z.string().min(1).max(PREDICTION_CONFIG.MAX_OUTCOME_LABEL_LENGTH),
      })
    )
    .optional(),
  sportCategory: z.string().nullable().optional(),
  matchReference: z.string().nullable().optional(),
  locksAt: z.string().datetime().optional(),
});

export const PATCH = createApiHandler('/api/predictions/[id]', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    const id = extractId(request.url);
    const body = patchSchema.parse(await request.json());

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { outcomes: true, stakes: true },
    });

    if (!prediction) throw new NotFoundError('Prediction not found');

    if (prediction.creatorUsername !== user.username) {
      throw new ForbiddenError('Only the creator can edit this prediction');
    }

    if (prediction.status !== 'OPEN') {
      throw new ValidationError('Can only edit OPEN predictions');
    }

    const nonCreatorStakes = prediction.stakes.filter(
      (s) => s.username !== prediction.creatorUsername
    );
    if (nonCreatorStakes.length > 0) {
      throw new ForbiddenError('Cannot edit a prediction that other users have staked on');
    }

    // Validate lock time if being updated
    if (body.locksAt) {
      const locksAt = new Date(body.locksAt);
      const lockDelta = locksAt.getTime() - Date.now();

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
    }

    // Validate outcome IDs match existing outcomes (cannot add/remove)
    if (body.outcomes) {
      const existingIds = new Set(prediction.outcomes.map((o) => o.id));
      const providedIds = new Set(body.outcomes.map((o) => o.id));

      if (
        existingIds.size !== providedIds.size ||
        ![...existingIds].every((id) => providedIds.has(id))
      ) {
        throw new ValidationError('Cannot add or remove outcomes — only labels can be updated');
      }
    }

    // Update prediction + outcome labels in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update outcome labels if provided
      if (body.outcomes) {
        for (const outcome of body.outcomes) {
          await tx.predictionOutcome.update({
            where: { id: outcome.id },
            data: { label: outcome.label },
          });
        }
      }

      // Build prediction update data
      const updateData: Record<string, unknown> = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.sportCategory !== undefined) updateData.sportCategory = body.sportCategory;
      if (body.matchReference !== undefined) updateData.matchReference = body.matchReference;
      if (body.locksAt !== undefined) updateData.locksAt = new Date(body.locksAt);

      return tx.prediction.update({
        where: { id },
        data: updateData,
        include: { outcomes: true, stakes: true },
      });
    });

    ctx.log.info('Prediction updated', { predictionId: id, username: user.username });

    return apiSuccess({ prediction: serializePrediction(updated, user.username) });
  });
});
