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
import { proposeSettlement } from '@/lib/predictions/settlement';
import { checkAutoSettleEligibility } from '@/lib/predictions/auto-settle';
import { notifyAdminsOfProposal } from '@/lib/predictions/notifications';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const settleSchema = z.object({
  winningOutcomeId: z.string().uuid(),
});

export const POST = createApiHandler('/api/predictions/[id]/settle', async (request, _ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();

    const predictionId = new URL(request.url).pathname.split('/predictions/')[1]?.split('/')[0];
    const body = settleSchema.parse(await request.json());

    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { outcomes: true },
    });

    if (!prediction) throw new NotFoundError('Prediction not found');

    const isCreator = prediction.creatorUsername === user.username;
    const isAdmin = PREDICTION_CONFIG.ADMIN_ACCOUNTS.includes(user.username);
    if (!isCreator && !isAdmin) {
      throw new ForbiddenError('Only the creator or admins can settle predictions');
    }

    if (prediction.status !== 'LOCKED') {
      throw new ValidationError('Prediction must be in LOCKED status to settle');
    }

    const validOutcome = prediction.outcomes.find((o) => o.id === body.winningOutcomeId);
    if (!validOutcome) {
      throw new ValidationError('Invalid winning outcome ID');
    }

    // Check if auto-settle can handle this — block manual if so
    const eligibility = await checkAutoSettleEligibility(
      prediction.matchReference,
      prediction.outcomes.map((o) => ({ id: o.id, label: o.label }))
    );
    if (!eligibility.canManualSettle) {
      throw new ValidationError(eligibility.reason);
    }

    await proposeSettlement(predictionId, body.winningOutcomeId, user.username);

    // Notify other admins (fire-and-forget)
    notifyAdminsOfProposal(prediction, user.username, {
      action: 'settle',
      outcomeLabel: validOutcome.label,
    }).catch(() => {});

    return apiSuccess({ status: 'PENDING_APPROVAL' });
  });
});
