import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';
import { prisma } from '@/lib/db/prisma';
import {
  validateOperations,
  signAndBroadcast,
  OperationValidationError,
} from '@/lib/hive/signing-relay';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import type { HiveOperation } from '@/types/hive-operations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/hive/sign
// ---------------------------------------------------------------------------

export const POST = createApiHandler('/api/hive/sign', async (request: Request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    // 1. Authenticate via session cookie
    const user = await getAuthenticatedUserFromSession(request as NextRequest);

    if (!user) {
      return apiError('Authentication required', 'UNAUTHORIZED', 401, {
        requestId: ctx.requestId,
      });
    }

    // 2. Custodial-only guard — wallet users sign client-side
    if (user.authType !== 'soft') {
      return apiError('Signing relay is only available for custodial accounts', 'FORBIDDEN', 403, {
        requestId: ctx.requestId,
      });
    }

    // 3. Require hiveUsername (account must have been created)
    if (!user.hiveUsername) {
      return apiError('No Hive account linked to this user', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    // 4. Parse body
    let operations: HiveOperation[];
    try {
      const body = await request.json();
      operations = body.operations;
    } catch {
      return apiError('Invalid JSON body', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    if (!Array.isArray(operations) || operations.length === 0) {
      return apiError('operations must be a non-empty array', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    if (operations.length > 10) {
      return apiError('Maximum 10 operations per request', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    // 5. Rate limit (distributed — works across serverless invocations)
    const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.signingRelay, 'signingRelay');
    if (!rateLimit.success) {
      return apiError('Too many requests — max 10 operations per minute', 'RATE_LIMITED', 429, {
        requestId: ctx.requestId,
        headers: createRateLimitHeaders(
          rateLimit.remaining,
          rateLimit.reset,
          RATE_LIMITS.signingRelay.limit
        ),
      });
    }

    // 6. Look up CustodialUser
    const custodialUser = await prisma.custodialUser.findFirst({
      where: { hiveUsername: user.hiveUsername },
      select: { id: true },
    });

    if (!custodialUser) {
      return apiError('Custodial account not found', 'NOT_FOUND', 404, {
        requestId: ctx.requestId,
      });
    }

    // 7. Validate operations
    try {
      validateOperations(operations, user.hiveUsername);
    } catch (err) {
      if (err instanceof OperationValidationError) {
        return apiError(err.message, 'VALIDATION_ERROR', 400, {
          requestId: ctx.requestId,
        });
      }
      throw err;
    }

    // 8. Sign and broadcast
    ctx.log.info('Signing relay broadcast', {
      hiveUsername: user.hiveUsername,
      opCount: operations.length,
      opTypes: operations.map(([type]) => type),
    });

    const result = await signAndBroadcast(user.hiveUsername, custodialUser.id, operations);

    return apiSuccess({ transactionId: result.transactionId });
  });
});
