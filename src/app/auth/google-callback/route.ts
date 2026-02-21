import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/next-auth-options';

/**
 * Server-side Google OAuth callback handler (route handler).
 *
 * After Google sign-in, NextAuth redirects here. We read the session
 * server-side (instant redirect, no client-side flash) and route:
 * - New user (no hiveUsername) → /onboarding/username
 * - Existing user → /sportsbites
 * - No session → /auth (sign-in failed)
 *
 * Using a route handler (not a page) avoids webpack trying to resolve
 * server-only modules (pg/dns) in the client bundle.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.redirect(
      new URL('/auth', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (session.user.hiveUsername) {
    return NextResponse.redirect(new URL('/sportsbites', baseUrl));
  }

  return NextResponse.redirect(new URL('/onboarding/username', baseUrl));
}
