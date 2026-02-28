import { NextRequest, NextResponse } from 'next/server';
import {
  getRealtimeMonitor,
  startRealtimeMonitoring,
  stopRealtimeMonitoring,
} from '@/lib/hive-workerbee/realtime';
import { withCsrfProtection } from '@/lib/api/csrf';
import { createRequestContext } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';

const ROUTE = '/api/hive/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const monitor = getRealtimeMonitor();
  const status = monitor.getStatus();
  return NextResponse.json({ success: true, status });
}

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    // Authentication check
    const user = await getAuthenticatedUserFromSession(request);
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

    const ctx = createRequestContext(ROUTE);
    try {
      await startRealtimeMonitoring();
      const status = getRealtimeMonitor().getStatus();
      return NextResponse.json({ success: true, started: true, status });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    // Authentication check
    const user = await getAuthenticatedUserFromSession(request);
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

    const ctx = createRequestContext(ROUTE);
    try {
      await stopRealtimeMonitoring();
      const status = getRealtimeMonitor().getStatus();
      return NextResponse.json({ success: true, stopped: true, status });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
