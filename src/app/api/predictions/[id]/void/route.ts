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
import { proposeVoid } from '@/lib/predictions/settlement';
import { notifyAdminsOfProposal } from '@/lib/predictions/notifications';
import { extractPathParam } from '@/lib/api/route-params';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const voidSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const POST = createApiHandler('/api/predictions/[id]/void', async (request, _ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    const predictionId = extractPathParam(request.url, 'predictions') ?? '';
    const body = voidSchema.parse(await request.json());

    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
    });

    if (!prediction) throw new NotFoundError('Prediction not found');

    const isCreator = prediction.creatorUsername === user.username;
    const isAdmin =
      PREDICTION_CONFIG.ADMIN_ACCOUNTS.includes(user.username) && user.authType === 'hive';
    if (!isCreator && !isAdmin) {
      throw new ForbiddenError(
        'Only the creator or Hive-authenticated admins can void predictions'
      );
    }

    if (!['OPEN', 'LOCKED', 'PENDING_APPROVAL'].includes(prediction.status)) {
      throw new ValidationError('Prediction must be OPEN, LOCKED, or PENDING_APPROVAL to void');
    }

    await proposeVoid(predictionId, body.reason, user.username);

    // Notify other admins (fire-and-forget)
    notifyAdminsOfProposal(prediction, user.username, {
      action: 'void',
      reason: body.reason,
    }).catch((err) => logger.error('Prediction notification failed', 'predictions', err));

    return apiSuccess({ status: 'PENDING_APPROVAL' });
  });
});
