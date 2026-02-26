import {
  createApiHandler,
  apiSuccess,
  AuthError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';
import { prisma } from '@/lib/db/prisma';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { buildStakeEscrowOp } from '@/lib/predictions/escrow';
import { signStakeToken } from '@/lib/predictions/stake-token';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const stakeSchema = z.object({
  outcomeId: z.string().uuid(),
  amount: z.number().min(PREDICTION_CONFIG.MIN_STAKE).max(PREDICTION_CONFIG.MAX_STAKE),
});

export const POST = createApiHandler('/api/predictions/[id]/stake', async (request, _ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (user.authType !== 'hive') {
      throw new ForbiddenError('Only Hive wallet users can place stakes');
    }

    const predictionId = new URL(request.url).pathname.split('/predictions/')[1]?.split('/')[0];
    const body = stakeSchema.parse(await request.json());

    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { outcomes: true },
    });

    if (!prediction) throw new NotFoundError('Prediction not found');
    if (prediction.status !== 'OPEN') {
      throw new ValidationError('Prediction is not open for staking');
    }
    if (prediction.locksAt <= new Date()) {
      throw new ValidationError('Prediction has passed its lock time');
    }

    const outcome = prediction.outcomes.find((o) => o.id === body.outcomeId);
    if (!outcome) throw new ValidationError('Invalid outcome ID');

    const existingStake = await prisma.predictionStake.findUnique({
      where: {
        predictionId_username_outcomeId: {
          predictionId: prediction.id,
          username: user.username,
          outcomeId: body.outcomeId,
        },
      },
    });
    if (existingStake) {
      throw new ValidationError('You have already staked on this outcome');
    }

    const operation = buildStakeEscrowOp(user.username, body.amount, prediction.id, body.outcomeId);
    const stakeToken = signStakeToken({
      predictionId: prediction.id,
      username: user.username,
      outcomeId: body.outcomeId,
      amount: body.amount,
    });

    return apiSuccess({ operation, stakeToken });
  });
});
