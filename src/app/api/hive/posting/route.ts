import { NextRequest, NextResponse } from 'next/server';
import { canUserPost } from '@/lib/hive-workerbee/posting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { success: false, error: 'Username query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const canPost = await canUserPost(username);
    return NextResponse.json({ success: true, username, canPost });
  } catch (error) {
    console.error('[API] Failed to evaluate posting status:', error);
    const message = error instanceof Error ? error.message : 'Unknown posting error';

    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
