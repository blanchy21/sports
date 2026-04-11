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
import { executeSettlement, executeVoidRefund } from '@/lib/predictions/settlement';
import { extractPathParam } from '@/lib/api/route-params';
import { NextRequest } from 'next/server';

export const POST = createApiHandler('/api/predictions/[id]/approve', async (request, _ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    if (!PREDICTION_CONFIG.ADMIN_ACCOUNTS.includes(user.username) || user.authType !== 'hive') {
      throw new ForbiddenError('Only Hive-authenticated admins can approve proposals');
    }

    const predictionId = extractPathParam(request.url, 'predictions') ?? '';

    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
    });

    if (!prediction) throw new NotFoundError('Prediction not found');

    // SETTLING = partial settlement failed mid-broadcast, allow admin retry
    if (prediction.status === 'SETTLING') {
      if (!prediction.winningOutcomeId) {
        throw new ValidationError('SETTLING prediction has no winningOutcomeId — cannot retry');
      }
      const settlement = await executeSettlement(
        predictionId,
        prediction.winningOutcomeId,
        user.username
      );
      return apiSuccess({ settlement, retried: true });
    }

    if (prediction.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('Prediction must be PENDING_APPROVAL or SETTLING to approve');
    }

    if (prediction.proposedBy === user.username) {
      throw new ForbiddenError('Cannot approve your own proposal — a different admin must approve');
    }

    if (!prediction.proposedAction) {
      throw new ValidationError('No proposal action found');
    }

    if (prediction.proposedAction === 'settle') {
      if (!prediction.proposedOutcomeId) {
        throw new ValidationError('No proposed outcome found');
      }
      const settlement = await executeSettlement(
        predictionId,
        prediction.proposedOutcomeId,
        user.username
      );
      return apiSuccess({ settlement });
    }

    if (prediction.proposedAction === 'void') {
      await executeVoidRefund(
        predictionId,
        prediction.proposedVoidReason || 'Voided by admin',
        user.username
      );
      return apiSuccess({ message: 'Prediction voided and stakes refunded' });
    }

    throw new ValidationError(`Unknown proposal action: ${prediction.proposedAction}`);
  });
});
