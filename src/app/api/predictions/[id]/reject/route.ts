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
import { rejectProposal } from '@/lib/predictions/settlement';
import { notifyProposerOfRejection } from '@/lib/predictions/notifications';
import { extractPathParam } from '@/lib/api/route-params';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';

export const POST = createApiHandler('/api/predictions/[id]/reject', async (request, _ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    if (!PREDICTION_CONFIG.ADMIN_ACCOUNTS.includes(user.username) || user.authType !== 'hive') {
      throw new ForbiddenError('Only Hive-authenticated admins can reject proposals');
    }

    const predictionId = extractPathParam(request.url, 'predictions') ?? '';

    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
    });

    if (!prediction) throw new NotFoundError('Prediction not found');

    if (prediction.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('Prediction must be PENDING_APPROVAL to reject');
    }

    await rejectProposal(predictionId);

    // Notify proposer (fire-and-forget)
    notifyProposerOfRejection(prediction, user.username).catch((err) =>
      logger.error('Prediction notification failed', 'predictions', err)
    );

    return apiSuccess({ message: 'Proposal rejected — prediction returned to LOCKED' });
  });
});
