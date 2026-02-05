/**
 * Session Management API
 *
 * Handles secure session tokens using httpOnly cookies with AES-256-GCM encryption.
 * This prevents XSS attacks from accessing session data and ensures integrity.
 *
 * POST /api/auth/session - Set session (login)
 * DELETE /api/auth/session - Clear session (logout)
 * GET /api/auth/session - Get current session info
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import crypto from 'crypto';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { decryptSession } from '@/lib/api/session-auth';

const SESSION_COOKIE_NAME = 'sb_session';
const SESSION_MAX_AGE = 30 * 60; // 30 minutes in seconds

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

/**
 * Get or generate the session encryption key.
 * In production, SESSION_SECRET must be set as a 32+ character string.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    // Development fallback - NOT SECURE, only for local development
    console.warn(
      '[Session API] WARNING: Using insecure default key. Set SESSION_SECRET in production.'
    );
    return crypto.scryptSync('development-only-insecure-key', 'salt', 32);
  }

  // Derive a 256-bit key from the secret using scrypt
  return crypto.scryptSync(secret, 'sportsblock-session-salt', 32);
}

// Validation schema for session data
const sessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required'),
  authType: z.enum(['hive', 'soft', 'firebase', 'guest']),
  hiveUsername: z.string().optional(),
  loginAt: z.number().optional(),
});

type SessionData = z.infer<typeof sessionSchema>;

/**
 * Encrypt session data for secure cookie storage.
 * Uses AES-256-GCM for authenticated encryption.
 */
function encryptSession(data: SessionData): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const jsonData = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(jsonData, 'utf8'), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data, then base64 encode
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * POST /api/auth/session - Create/update session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = sessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid session data' }, { status: 400 });
    }

    const sessionData = parseResult.data;
    const encryptedSession = encryptSession(sessionData);

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Session created',
    });

    // Set httpOnly cookie with encrypted session
    response.cookies.set(SESSION_COOKIE_NAME, encryptedSession, {
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

    const session = decryptSession(sessionCookie.value);

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
        loginAt: session.loginAt,
      },
    });
  } catch (error) {
    console.error('[Session API] Error getting session:', error);
    return NextResponse.json({ success: false, error: 'Failed to get session' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/session - Clear session (logout)
 */
export async function DELETE(request: NextRequest) {
  // CSRF protection for logout
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

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
    return NextResponse.json({ success: false, error: 'Failed to clear session' }, { status: 500 });
  }
}
