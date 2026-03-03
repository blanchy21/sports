import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchFollowing } from '@/lib/hive-workerbee/social';
import { createRequestContext } from '@/lib/api/response';
import { hiveUsernameSchema, limitSchema, parseSearchParams } from '@/lib/api/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/social/following';

const querySchema = z.object({
  username: hiveUsernameSchema,
  limit: limitSchema,
  before: z.string().max(256).optional(),
});

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const parseResult = parseSearchParams(request.nextUrl.searchParams, querySchema);
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: parseResult.error.issues.map((i) => i.message).join('; ') },
      { status: 400 }
    );
  }

  const { username, limit, before } = parseResult.data;

  try {
    const result = await fetchFollowing(username, { limit, before });

    return NextResponse.json(
      {
        success: true,
        relationships: result.relationships,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        total: result.total,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
