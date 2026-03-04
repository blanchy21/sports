import { NextRequest, NextResponse } from 'next/server';
import { getPostVotes } from '@/lib/hive-workerbee/voting';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { createApiHandler, validationError } from '@/lib/api/response';
import { parseSearchParams, hiveUsernameSchema, permlinkSchema } from '@/lib/api/validation';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/votes';

const votesQuerySchema = z.object({
  author: hiveUsernameSchema,
  permlink: permlinkSchema,
});

export const GET = createApiHandler(ROUTE, async (request, ctx) => {
  const parseResult = parseSearchParams((request as NextRequest).nextUrl.searchParams, votesQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { author, permlink } = parseResult.data;

  ctx.log.debug('Fetching votes', { author, permlink });

  const votes = await retryWithBackoff(() => getPostVotes(author, permlink), {
    maxRetries: 2,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  });

  return NextResponse.json({
    success: true,
    votes: votes || [],
    count: votes?.length || 0,
  });
});
