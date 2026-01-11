import { NextRequest, NextResponse } from 'next/server';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { accountSummaryQuerySchema, parseSearchParams } from '@/lib/api/validation';
import { createRequestContext, validationError, notFoundError } from '@/lib/api/response';

function serializeAccount(account: unknown) {
  if (!account || typeof account !== 'object') {
    return account;
  }

  const safeAccount: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(account)) {
    if (value instanceof Date) {
      safeAccount[key] = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      safeAccount[key] = serializeAccount(value);
    } else if (Array.isArray(value)) {
      safeAccount[key] = value.map((item) =>
        item && typeof item === 'object' ? serializeAccount(item) : item
      );
    } else {
      safeAccount[key] = value;
    }
  }

  return safeAccount;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/account/summary';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  // Validate query parameters
  const parseResult = parseSearchParams(request.nextUrl.searchParams, accountSummaryQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username } = parseResult.data;

  try {
    ctx.log.debug('Fetching account summary', { username });

    const account = await retryWithBackoff(
      () => fetchUserAccount(username),
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );

    if (!account) {
      return notFoundError(`Account ${username} not found`, ctx.requestId);
    }

    return NextResponse.json({
      success: true,
      account: serializeAccount(account),
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

