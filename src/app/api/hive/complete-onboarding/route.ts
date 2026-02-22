import { NextRequest } from 'next/server';
import { createApiHandler, apiError, apiSuccess } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions, jwtFieldsCache } from '@/lib/auth/next-auth-options';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createApiHandler('/api/hive/complete-onboarding', async (request: Request, ctx) => {
  // 1. Authenticate — must be a custodial (soft) user
  const user = await getAuthenticatedUserFromSession(request as NextRequest);

  if (!user) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401, {
      requestId: ctx.requestId,
    });
  }

  if (user.authType !== 'soft') {
    return apiError('Onboarding completion is only for custodial accounts', 'FORBIDDEN', 403, {
      requestId: ctx.requestId,
    });
  }

  if (!user.hiveUsername) {
    return apiError('No Hive account linked to this user', 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
  }

  // 2. Verify NextAuth session matches (defense-in-depth)
  const nextAuthSession = await getServerSession(authOptions);
  if (!nextAuthSession?.user?.id || nextAuthSession.user.id !== user.userId) {
    return apiError('Please re-authenticate', 'UNAUTHORIZED', 401, {
      requestId: ctx.requestId,
    });
  }

  // 3. Mark onboarding as completed
  const custodialUser = await prisma.custodialUser.findFirst({
    where: { hiveUsername: user.hiveUsername },
    select: { id: true, onboardingCompleted: true },
  });

  if (!custodialUser) {
    return apiError('User not found', 'NOT_FOUND', 404, {
      requestId: ctx.requestId,
    });
  }

  if (!custodialUser.onboardingCompleted) {
    await prisma.custodialUser.update({
      where: { id: custodialUser.id },
      data: { onboardingCompleted: true },
    });
    jwtFieldsCache.invalidateByTag(`custodial-user:${custodialUser.id}`);
  }

  ctx.log.info('Onboarding completed', { hiveUsername: user.hiveUsername });

  return apiSuccess({ completed: true });
});
