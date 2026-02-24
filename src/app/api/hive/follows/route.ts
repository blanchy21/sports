import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api/response';
import { isFollowingUser } from '@/lib/hive-workerbee/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/follows';

/**
 * GET /api/hive/follows?follower=alice&targets=bob,carol,dave
 *
 * Checks follow status for a follower against multiple targets in parallel.
 * Returns a map of target username -> boolean.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const follower = searchParams.get('follower');
  const targetsParam = searchParams.get('targets');

  if (!follower || !targetsParam) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameters: follower, targets' },
      { status: 400 }
    );
  }

  const targets = targetsParam
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (targets.length === 0) {
    return NextResponse.json(
      { success: false, error: 'targets parameter must contain at least one username' },
      { status: 400 }
    );
  }

  if (targets.length > 50) {
    return NextResponse.json(
      { success: false, error: 'Maximum 50 targets per request' },
      { status: 400 }
    );
  }

  const ctx = createRequestContext(ROUTE);
  try {
    const results = await Promise.allSettled(
      targets.map((target) => isFollowingUser(target, follower))
    );

    const followStatus: Record<string, boolean> = {};
    targets.forEach((target, i) => {
      const result = results[i];
      followStatus[target] = result.status === 'fulfilled' ? result.value : false;
    });

    return NextResponse.json({ success: true, followStatus });
  } catch (error) {
    return ctx.handleError(error);
  }
}
