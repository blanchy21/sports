/**
 * Admin Cron Trigger Proxy
 *
 * Allows admin users to trigger cron jobs via the dashboard.
 * Proxies requests to internal cron endpoints with proper auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestContext, forbiddenError } from '@/lib/api/response';
import { isAdminAccount } from '@/lib/admin/config';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/admin/trigger-cron';

const ALLOWED_CRON_TYPES = ['staking-rewards', 'curator-rewards', 'weekly-rewards'] as const;

const bodySchema = z.object({
  cronType: z.enum(ALLOWED_CRON_TYPES),
});

export async function POST(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const user = await getAuthenticatedUserFromSession(request);
  if (!user || !isAdminAccount(user.username)) {
    return forbiddenError('Admin access required', ctx.requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = bodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      },
      { status: 400 }
    );
  }

  const { cronType } = parseResult.data;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    );
  }

  try {
    const origin = request.nextUrl.origin;
    const cronUrl = `${origin}/api/cron/${cronType}`;

    ctx.log.info('Triggering cron job', { cronType, url: cronUrl, triggeredBy: user.username });

    const cronResponse = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const cronData = await cronResponse.json();

    return NextResponse.json({
      success: cronResponse.ok,
      cronType,
      statusCode: cronResponse.status,
      result: cronData,
      triggeredBy: user.username,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    ctx.log.error('Failed to trigger cron job', error, { cronType });
    return ctx.handleError(error);
  }
}
