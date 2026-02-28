import {
  createApiHandler,
  apiSuccess,
  AuthError,
  ValidationError,
  ForbiddenError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';
import { prisma } from '@/lib/db/prisma';
import { verifyStakeToken } from '@/lib/predictions/stake-token';
import { verifyStakeTransaction } from '@/lib/predictions/verify-stake';
import { serializePrediction } from '@/lib/predictions/serialize';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const confirmSchema = z.object({
  stakeToken: z.string().min(1),
  txId: z.string().min(1),
});

export const POST = createApiHandler(
  '/api/predictions/[id]/stake/confirm',
  async (request, _ctx) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();
      if (user.authType !== 'hive') {
        throw new ForbiddenError('Only Hive wallet users can confirm stakes');
      }

      const body = confirmSchema.parse(await request.json());

      const tokenData = verifyStakeToken(body.stakeToken);
      if (!tokenData) throw new ValidationError('Invalid or expired stake token');

      if (tokenData.username !== user.username) {
        throw new ForbiddenError('Stake token does not match authenticated user');
      }

      const predictionId = tokenData.predictionId;

      logger.info('Confirming stake', 'predictions', {
        predictionId,
        username: user.username,
        outcomeId: tokenData.outcomeId,
        amount: tokenData.amount,
        txId: body.txId,
      });

      // Verify the transaction exists on-chain with correct parameters
      const verification = await verifyStakeTransaction({
        txId: body.txId,
        expectedUsername: user.username,
        expectedAmount: tokenData.amount,
        expectedPredictionId: predictionId,
        expectedOutcomeId: tokenData.outcomeId,
      });

      if (!verification.valid) {
        logger.warn('Stake verification failed', 'predictions', {
          predictionId,
          txId: body.txId,
          error: verification.error,
        });
        throw new ValidationError(`Transaction verification failed: ${verification.error}`);
      }

      const prediction = await prisma.$transaction(async (tx) => {
        await tx.predictionStake.create({
          data: {
            predictionId,
            outcomeId: tokenData.outcomeId,
            username: user.username,
            amount: tokenData.amount,
            stakeTxId: body.txId,
          },
        });

        await tx.predictionEscrowLedger.create({
          data: {
            predictionId,
            entryType: 'stake_in',
            username: user.username,
            amount: tokenData.amount,
            txId: body.txId,
          },
        });

        await tx.predictionOutcome.update({
          where: { id: tokenData.outcomeId },
          data: {
            totalStaked: { increment: tokenData.amount },
            backerCount: { increment: 1 },
          },
        });

        return tx.prediction.update({
          where: { id: predictionId },
          data: {
            totalPool: { increment: tokenData.amount },
          },
          include: {
            outcomes: true,
            stakes: true,
          },
        });
      });

      return apiSuccess(serializePrediction(prediction, user.username));
    });
  }
);
