import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createHiveAccountForUser, AccountCreationError } from '@/lib/hive/account-creation';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { jwtFieldsCache } from '@/lib/auth/next-auth-options';

export const POST = createApiHandler('/api/hive/create-account', async (request: Request, ctx) => {
  // Auth: require sb_session cookie
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401);
  }

  // Must be a custodial (soft) user
  if (user.authType !== 'soft') {
    return apiError(
      'Only custodial users can create Hive accounts via this endpoint',
      'FORBIDDEN',
      403
    );
  }

  // Rate limit — prevent rapid ACT exhaustion (3 per day per user)
  const rateLimit = await checkRateLimit(
    user.userId,
    RATE_LIMITS.accountCreation,
    'accountCreation'
  );
  if (!rateLimit.success) {
    return apiError(
      'Too many account creation attempts. Please try again later.',
      'RATE_LIMITED',
      429
    );
  }

  // Check if user already has a Hive username
  if (user.hiveUsername) {
    return apiError('You already have a Hive account', 'VALIDATION_ERROR', 400);
  }

  // Parse body
  const body = await request.json();
  const username = typeof body.username === 'string' ? body.username.toLowerCase().trim() : '';

  if (!username) {
    return apiError('username is required', 'VALIDATION_ERROR', 400);
  }

  // Look up the custodial user record
  const custodialUser = await prisma.custodialUser.findFirst({
    where: {
      OR: [{ id: user.userId }, { email: user.username }],
    },
  });

  if (!custodialUser) {
    return apiError('Custodial user record not found', 'NOT_FOUND', 404);
  }

  if (custodialUser.hiveUsername) {
    return apiError('You already have a Hive account', 'VALIDATION_ERROR', 400);
  }

  ctx.log.info('Creating Hive account', { username, custodialUserId: custodialUser.id });

  try {
    const result = await createHiveAccountForUser(username, custodialUser.id);
    jwtFieldsCache.invalidateByTag(`custodial-user:${custodialUser.id}`);
    ctx.log.info('Hive account created successfully', { username: result.hiveUsername });
    return apiSuccess({ hiveUsername: result.hiveUsername });
  } catch (err) {
    // Surface critical AccountCreationError messages directly to the user
    if (err instanceof AccountCreationError) {
      return apiError(err.message, 'INTERNAL_ERROR', 500, { requestId: ctx.requestId });
    }
    throw err;
  }
});
