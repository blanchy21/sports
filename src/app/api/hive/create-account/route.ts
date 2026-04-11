import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createHiveAccountForUser, AccountCreationError } from '@/lib/hive/account-creation';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { jwtFieldsCache } from '@/lib/auth/next-auth-options';

const createAccountSchema = z.object({
  username: z
    .string()
    .min(4)
    .max(16)
    .regex(
      /^sb-[a-z0-9][a-z0-9.-]*$/,
      'Username must start with "sb-" and contain only lowercase letters, digits, dots, and dashes'
    ),
});

export const POST = createApiHandler('/api/hive/create-account', async (request: Request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    // IP rate limit — prevent multi-account abuse (5 accounts per IP per day)
    const ipRateLimit = await checkRateLimit(
      getClientIdentifier(request),
      { limit: 5, windowSeconds: 86400 },
      'accountCreationIp'
    );
    if (!ipRateLimit.success) {
      return apiError(
        'Too many account creation attempts from this network. Please try again later.',
        'RATE_LIMITED',
        429
      );
    }

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
    // Not strict: falls back to in-memory when Redis is unavailable/over quota
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

    // Parse body — normalise then validate with Zod
    const rawBody = (await request.json()) as Record<string, unknown>;
    const normalised = {
      ...rawBody,
      username:
        typeof rawBody.username === 'string'
          ? rawBody.username.toLowerCase().trim()
          : rawBody.username,
    };
    let username: string;
    try {
      username = createAccountSchema.parse(normalised).username;
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request body';
      return apiError(message ?? 'Invalid request body', 'VALIDATION_ERROR', 400);
    }

    // Look up the custodial user record by ID (works for all OAuth providers)
    const custodialUser = await prisma.custodialUser.findUnique({
      where: { id: user.userId },
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
});
