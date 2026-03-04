import { NextRequest, NextResponse } from 'next/server';
import {
  getRealtimeMonitor,
  startRealtimeMonitoring,
  stopRealtimeMonitoring,
} from '@/lib/hive-workerbee/realtime';
import { csrfProtected } from '@/lib/api/csrf';
import { createApiHandler } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';

const ROUTE = '/api/hive/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler(ROUTE, async () => {
  const monitor = getRealtimeMonitor();
  const status = monitor.getStatus();
  return NextResponse.json({ success: true, status });
});

export const POST = csrfProtected(
  createApiHandler(ROUTE, async (request) => {
    // Authentication check
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Admin check — only admins can control the realtime monitor
    if (!requireAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.realtime, 'realtimeControl');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: createRateLimitHeaders(
            rateLimit.remaining,
            rateLimit.reset,
            RATE_LIMITS.realtime.limit
          ),
        }
      );
    }

    await startRealtimeMonitoring();
    const status = getRealtimeMonitor().getStatus();
    return NextResponse.json({ success: true, started: true, status });
  })
);

export const DELETE = csrfProtected(
  createApiHandler(ROUTE, async (request) => {
    // Authentication check
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Admin check — only admins can control the realtime monitor
    if (!requireAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(user.userId, RATE_LIMITS.realtime, 'realtimeControl');
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: createRateLimitHeaders(
            rateLimit.remaining,
            rateLimit.reset,
            RATE_LIMITS.realtime.limit
          ),
        }
      );
    }

    await stopRealtimeMonitoring();
    const status = getRealtimeMonitor().getStatus();
    return NextResponse.json({ success: true, stopped: true, status });
  })
);
