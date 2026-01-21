/**
 * Session Management API
 *
 * Handles secure session tokens using httpOnly cookies.
 * This prevents XSS attacks from accessing session data.
 *
 * POST /api/auth/session - Set session (login)
 * DELETE /api/auth/session - Clear session (logout)
 * GET /api/auth/session - Get current session info
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const SESSION_COOKIE_NAME = 'sb_session';
const SESSION_MAX_AGE = 30 * 60; // 30 minutes in seconds

// Validation schema for session data
const sessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required'),
  authType: z.enum(['hive', 'firebase', 'guest']),
  hiveUsername: z.string().optional(),
});

type SessionData = z.infer<typeof sessionSchema>;

/**
 * Encode session data for cookie storage
 */
function encodeSession(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode session data from cookie
 */
function decodeSession(encoded: string): SessionData | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const result = sessionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/session - Create/update session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = sessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session data' },
        { status: 400 }
      );
    }

    const sessionData = parseResult.data;
    const encodedSession = encodeSession(sessionData);

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Session created',
    });

    // Set httpOnly cookie
    response.cookies.set(SESSION_COOKIE_NAME, encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Session API] Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/session - Get current session
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        session: null,
      });
    }

    const session = decodeSession(sessionCookie.value);

    if (!session) {
      // Invalid session, clear the cookie
      const response = NextResponse.json({
        success: true,
        authenticated: false,
        session: null,
      });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      session: {
        userId: session.userId,
        username: session.username,
        authType: session.authType,
        hiveUsername: session.hiveUsername,
      },
    });
  } catch (error) {
    console.error('[Session API] Error getting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session - Clear session (logout)
 */
export async function DELETE() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Session cleared',
    });

    // Clear the session cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Session API] Error clearing session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
