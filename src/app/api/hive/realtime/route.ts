import { NextRequest, NextResponse } from 'next/server';
import {
  getRealtimeMonitor,
  startRealtimeMonitoring,
  stopRealtimeMonitoring,
} from '@/lib/hive-workerbee/realtime';
import { withCsrfProtection } from '@/lib/api/csrf';
import { createRequestContext } from '@/lib/api/response';

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
