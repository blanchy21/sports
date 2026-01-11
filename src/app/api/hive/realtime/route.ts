import { NextRequest, NextResponse } from 'next/server';
import {
  getRealtimeMonitor,
  startRealtimeMonitoring,
  stopRealtimeMonitoring,
} from '@/lib/hive-workerbee/realtime';
import { withCsrfProtection } from '@/lib/api/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const monitor = getRealtimeMonitor();
  const status = monitor.getStatus();
  return NextResponse.json({ success: true, status });
}

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    try {
      await startRealtimeMonitoring();
      const status = getRealtimeMonitor().getStatus();
      return NextResponse.json({ success: true, started: true, status });
    } catch (error) {
      console.error('[API] Failed to start realtime monitoring:', error);
      const message = error instanceof Error ? error.message : 'Unknown realtime error';
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    try {
      await stopRealtimeMonitoring();
      const status = getRealtimeMonitor().getStatus();
      return NextResponse.json({ success: true, stopped: true, status });
    } catch (error) {
      console.error('[API] Failed to stop realtime monitoring:', error);
      const message = error instanceof Error ? error.message : 'Unknown realtime error';
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }
  });
}
