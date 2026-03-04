import { NextRequest, NextResponse } from 'next/server';
import { canUserPost } from '@/lib/hive-workerbee/posting-server';
import { postingStatusQuerySchema, parseSearchParams } from '@/lib/api/validation';
import { createApiHandler, validationError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/posting';

export const GET = createApiHandler(ROUTE, async (request, ctx) => {
  // Validate query parameters
  const parseResult = parseSearchParams((request as NextRequest).nextUrl.searchParams, postingStatusQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username } = parseResult.data;

  ctx.log.debug('Checking posting status', { username });

  const canPost = await canUserPost(username);
  return NextResponse.json({ success: true, username, canPost });
});
