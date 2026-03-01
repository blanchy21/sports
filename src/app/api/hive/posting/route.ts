import { NextRequest, NextResponse } from 'next/server';
import { canUserPost } from '@/lib/hive-workerbee/posting-server';
import { postingStatusQuerySchema, parseSearchParams } from '@/lib/api/validation';
import { createRequestContext, validationError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/posting';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  // Validate query parameters
  const parseResult = parseSearchParams(request.nextUrl.searchParams, postingStatusQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username } = parseResult.data;

  try {
    ctx.log.debug('Checking posting status', { username });

    const canPost = await canUserPost(username);
    return NextResponse.json({ success: true, username, canPost });
  } catch (error) {
    return ctx.handleError(error);
  }
}
