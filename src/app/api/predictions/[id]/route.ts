import { createApiHandler, apiSuccess, NotFoundError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';
import { serializePrediction } from '@/lib/predictions/serialize';
import { NextRequest } from 'next/server';

export const GET = createApiHandler('/api/predictions/[id]', async (request, _ctx) => {
  const id = new URL(request.url).pathname.split('/predictions/')[1]?.split('/')[0];

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
