import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { prisma } from '@/lib/db/prisma';
import {
  validateOperations,
  signAndBroadcast,
  OperationValidationError,
  type HiveOperation,
} from '@/lib/hive/signing-relay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// In-memory rate limiter — 10 ops/minute per user, no external dependency
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) {
    return false;
  }

  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/hive/sign
// ---------------------------------------------------------------------------

export const POST = createApiHandler('/api/hive/sign', async (request: Request, ctx) => {
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

  // 5. Rate limit
  if (!checkRateLimit(user.userId)) {
    return apiError('Too many requests — max 10 operations per minute', 'RATE_LIMITED', 429, {
      requestId: ctx.requestId,
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
