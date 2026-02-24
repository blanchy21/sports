/**
 * Hive Challenge API
 *
 * GET /api/auth/hive-challenge?username=...
 *
 * Returns a stateless HMAC-signed challenge for Hive wallet authentication.
 * The client signs this with their posting key to prove wallet ownership.
 *
 * No CSRF needed: read-only, no side effects, no session mutation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api/response';
import { createChallenge } from '@/lib/auth/hive-challenge';

const ROUTE = '/api/auth/hive-challenge';

// Hive username: 3-16 chars, lowercase alphanumeric + dots/dashes, no leading/trailing dots/dashes
const HIVE_USERNAME_RE = /^[a-z][a-z0-9.-]{1,14}[a-z0-9]$/;

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const username = request.nextUrl.searchParams.get('username')?.toLowerCase().trim();

  if (!username || !HIVE_USERNAME_RE.test(username)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing username' },
      { status: 400 }
    );
  }

  try {
    const { challenge, mac } = createChallenge(username);
    return NextResponse.json({ success: true, challenge, mac });
  } catch (error) {
    return ctx.handleError(error);
  }
}
