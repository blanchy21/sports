import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler('/api/hive/account-status', async (request: Request, ctx) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);

  if (!user) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401, {
      requestId: ctx.requestId,
    });
  }

  if (user.authType !== 'soft') {
    return apiError('Account status is only available for custodial accounts', 'FORBIDDEN', 403, {
      requestId: ctx.requestId,
    });
  }

  if (!user.hiveUsername) {
    return apiSuccess({
      hiveUsername: null,
      keysDownloaded: false,
      isGraduated: false,
    });
  }

  const custodialUser = await prisma.custodialUser.findUnique({
    where: { hiveUsername: user.hiveUsername },
    select: { hiveUsername: true, keysDownloaded: true, isGraduated: true },
  });

  if (!custodialUser) {
    return apiError('Custodial account not found', 'NOT_FOUND', 404, {
      requestId: ctx.requestId,
    });
  }

  return apiSuccess({
    hiveUsername: custodialUser.hiveUsername,
    keysDownloaded: custodialUser.keysDownloaded,
    isGraduated: custodialUser.isGraduated,
  });
});
