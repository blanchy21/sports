/**
 * Session Management API
 *
 * Handles secure session tokens using httpOnly cookies with AES-256-GCM encryption.
 * This prevents XSS attacks from accessing session data and ensures integrity.
 *
 * POST /api/auth/sb-session - Set session (login)
 * DELETE /api/auth/sb-session - Clear session (logout)
 * GET /api/auth/sb-session - Get current session info
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import crypto from 'crypto';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { decryptSession } from '@/lib/api/session-auth';
import { getSessionEncryptionKey } from '@/lib/api/session-encryption';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/next-auth-options';
import { verifyChallenge, verifyHivePostingSignature } from '@/lib/auth/hive-challenge';

const SESSION_COOKIE_NAME = 'sb_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const SESSION_ABSOLUTE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

// Validation schema for session data (includes optional challenge fields for Hive auth)
const sessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required'),
  authType: z.enum(['hive', 'soft', 'guest']),
  hiveUsername: z.string().optional(),
  loginAt: z.number().optional(), // Optional in input; always set server-side
  // Challenge-response fields for Hive wallet verification (stripped before storing in cookie)
  challenge: z.string().optional(),
  challengeMac: z.string().optional(),
  signature: z.string().optional(),
  // HiveSigner OAuth token for server-side verification (alternative to challenge-response)
  hivesignerToken: z.string().optional(),
});

// Session data stored in cookie (without challenge artifacts)
type SessionData = {
  userId: string;
  username: string;
  authType: 'hive' | 'soft' | 'guest';
  hiveUsername?: string;
  loginAt?: number;
};

/**
 * Encrypt session data for secure cookie storage.
 * Uses AES-256-GCM for authenticated encryption.
 */
function encryptSession(data: SessionData): string {
  const key = getSessionEncryptionKey();
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
 * Verify a HiveSigner OAuth access token by calling the HiveSigner API.
 * Returns the username if valid, or an error reason.
 */
async function verifyHivesignerToken(
  token: string,
  expectedUsername: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const res = await fetch('https://hivesigner.com/api/me', {
      headers: { Authorization: token },
    });

    if (!res.ok) {
      return { valid: false, reason: `HiveSigner API returned ${res.status}` };
    }

    const data = await res.json();
    const tokenUsername = (data.user ?? data.name ?? data.account ?? '').toLowerCase();
    const expected = expectedUsername.toLowerCase();

    if (!tokenUsername) {
      return { valid: false, reason: 'HiveSigner token did not return a username' };
    }

    if (tokenUsername !== expected) {
      return { valid: false, reason: 'HiveSigner token username mismatch' };
    }

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, reason: `HiveSigner verification failed: ${message}` };
  }
}

/**
 * POST /api/auth/sb-session - Create/update session
 */
export async function POST(request: NextRequest) {
  // CSRF protection for session creation
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  try {
    const body = await request.json();
    const parseResult = sessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid session data' }, { status: 400 });
    }

    const { challenge, challengeMac, signature, hivesignerToken, ...sessionFields } =
      parseResult.data;
    const sessionData: SessionData = sessionFields;

    // For Hive auth: verify wallet ownership via challenge-response
    if (sessionData.authType === 'hive') {
      // Session refresh: if the caller has a valid cookie for the same user+authType, allow
      // without re-signing (e.g., page reload, profile update, activity touch)
      const cookieStore = await cookies();
      const existingCookie = cookieStore.get(SESSION_COOKIE_NAME);
      let isSessionRefresh = false;

      if (existingCookie?.value) {
        const existing = decryptSession(existingCookie.value);
        if (
          existing &&
          existing.authType === 'hive' &&
          existing.username === sessionData.username
        ) {
          isSessionRefresh = true;
        }
      }

      if (isSessionRefresh) {
        // Preserve the original loginAt from the existing session
        const existingSession = decryptSession(existingCookie!.value);
        if (existingSession?.loginAt) {
          sessionData.loginAt = existingSession.loginAt;
        }
      } else if (hivesignerToken) {
        // HiveSigner OAuth: verify access token server-side
        // HiveSigner doesn't support message signing, so we verify the OAuth token instead.
        const tokenResult = await verifyHivesignerToken(hivesignerToken, sessionData.username);
        if (!tokenResult.valid) {
          return NextResponse.json(
            { success: false, error: `HiveSigner verification failed: ${tokenResult.reason}` },
            { status: 401 }
          );
        }
      } else if (challenge && challengeMac && signature) {
        // Wallet auth (Keychain, HiveAuth, etc.): verify challenge-response

        // Verify challenge integrity and expiry
        const challengeResult = verifyChallenge(challenge, challengeMac, sessionData.username);
        if (!challengeResult.valid) {
          return NextResponse.json(
            { success: false, error: `Challenge verification failed: ${challengeResult.reason}` },
            { status: 401 }
          );
        }

        // Verify the Hive signature against on-chain posting keys
        const sigResult = await verifyHivePostingSignature(
          challenge,
          signature,
          sessionData.username
        );
        if (!sigResult.valid) {
          return NextResponse.json(
            { success: false, error: `Signature verification failed: ${sigResult.reason}` },
            { status: 401 }
          );
        }
      } else {
        // No verification data provided
        return NextResponse.json(
          {
            success: false,
            error: 'Hive auth requires verification (challenge-response or HiveSigner token)',
          },
          { status: 401 }
        );
      }
    }

    // For custodial (soft) auth, verify the caller owns this identity via NextAuth
    // and override hiveUsername from the server-side session (not client-supplied)
    if (sessionData.authType === 'soft') {
      const nextAuthSession = await getServerSession(authOptions);
      if (!nextAuthSession?.user?.id || nextAuthSession.user.id !== sessionData.userId) {
        return NextResponse.json(
          { success: false, error: 'Session identity mismatch' },
          { status: 401 }
        );
      }
      // Use hiveUsername from NextAuth session (sourced from DB) instead of request body
      sessionData.hiveUsername = nextAuthSession.user.hiveUsername ?? sessionData.hiveUsername;
    }

    // Ensure loginAt is always set (fresh login gets Date.now(), refresh preserves original)
    if (!sessionData.loginAt) {
      sessionData.loginAt = Date.now();
    }

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
 * GET /api/auth/sb-session - Get current session
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

    // Enforce absolute session expiry (7 days from login)
    if (session.loginAt && Date.now() - session.loginAt > SESSION_ABSOLUTE_EXPIRY_MS) {
      const response = NextResponse.json({
        success: true,
        authenticated: false,
        session: null,
        reason: 'session_expired',
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
 * DELETE /api/auth/sb-session - Clear session (logout)
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
