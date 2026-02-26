import { NextRequest, NextResponse } from 'next/server';
import { getRecentOperations } from '@/lib/hive-workerbee/account';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { accountHistoryQuerySchema, parseSearchParams } from '@/lib/api/validation';
import { createRequestContext, validationError, internalError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/account/history';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  // Validate query parameters
  const parseResult = parseSearchParams(request.nextUrl.searchParams, accountHistoryQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username, limit } = parseResult.data;

  try {
    ctx.log.debug('Fetching transaction history', { username, limit });

    // Fetch recent operations using WorkerBee with retry logic
    const operations = await retryWithBackoff(() => getRecentOperations(username, limit), {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    });

    if (!operations) {
      return internalError('Failed to fetch transaction history', ctx.requestId);
    }

    ctx.log.debug('Fetched operations', { username, count: operations.length });

    return NextResponse.json(
      {
        success: true,
        operations,
        count: operations.length,
        username,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
