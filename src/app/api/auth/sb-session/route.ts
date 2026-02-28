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
import { createRequestContext } from '@/lib/api/response';
import { decryptSession } from '@/lib/api/session-auth';
import { getSessionEncryptionKey } from '@/lib/api/session-encryption';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/next-auth-options';
import { verifyChallenge, verifyHivePostingSignature } from '@/lib/auth/hive-challenge';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { syncDisplayName } from '@/lib/db/sync-author-data';

const ROUTE = '/api/auth/sb-session';
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
  // Optional display name for syncing denormalized author data
  displayName: z.string().optional(),
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
 * Wipe encrypted keys for a custodial user who has proven self-custody.
 * No-op if the user was never custodial or already wiped.
 */
async function graduateCustodialUser(hiveUsername: string): Promise<void> {
  const result = await prisma.custodialUser.updateMany({
    where: {
      hiveUsername,
      encryptedKeys: { not: null },
    },
    data: {
      encryptedKeys: null,
      encryptionIv: null,
      encryptionSalt: null,
    },
  });

  if (result.count > 0) {
    logger.info(
      `Custodial keys wiped for @${hiveUsername} — user graduated to self-custody`,
      'auth:graduate'
    );
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

  const ctx = createRequestContext(ROUTE);

  try {
    const body = await request.json();
    const parseResult = sessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid session data' }, { status: 400 });
    }

    const { challenge, challengeMac, signature, hivesignerToken, displayName, ...sessionFields } =
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
        // Preserve the original loginAt from the existing cookie to enforce
        // absolute session expiry. Never accept client-supplied loginAt on refresh.
        const existingSession = decryptSession(existingCookie!.value);
        if (existingSession?.loginAt) {
          sessionData.loginAt = existingSession.loginAt;
        }
      } else if (hivesignerToken) {
        // HiveSigner OAuth: verify access token server-side
        // HiveSigner doesn't support message signing, so we verify the OAuth token instead.
        const tokenResult = await verifyHivesignerToken(hivesignerToken, sessionData.username);
        if (!tokenResult.valid) {
          console.warn('[sb-session] HiveSigner verification failed:', tokenResult.reason);
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
          console.warn(
            '[sb-session] Challenge verification failed:',
            challengeResult.reason,
            '| user:',
            sessionData.username
          );
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
          console.warn(
            '[sb-session] Signature verification failed:',
            sigResult.reason,
            '| user:',
            sessionData.username
          );
          return NextResponse.json(
            { success: false, error: `Signature verification failed: ${sigResult.reason}` },
            { status: 401 }
          );
        }
      } else {
        // No verification data provided
        console.warn(
          '[sb-session] No verification data provided | user:',
          sessionData.username,
          '| has challenge:',
          !!challenge,
          '| has mac:',
          !!challengeMac,
          '| has sig:',
          !!signature,
          '| has token:',
          !!hivesignerToken
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Hive auth requires verification (challenge-response or HiveSigner token)',
          },
          { status: 401 }
        );
      }
      // Auto-graduate: if a Hive wallet user matches a custodial account, wipe server-side keys.
      // The user has just proven they have working keys in their wallet — the relay is no longer needed.
      if (!isSessionRefresh && sessionData.hiveUsername) {
        graduateCustodialUser(sessionData.hiveUsername).catch((err) => {
          console.warn('[sb-session] Key wipe failed (non-fatal):', err);
        });
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

    // Sync denormalized author display name if provided (fire-and-forget)
    if (displayName && sessionData.username) {
      syncDisplayName(sessionData.username, displayName).catch((err) => {
        logger.warn('Display name sync failed (non-fatal)', 'sb-session', err);
      });
    }

    const encryptedSession = encryptSession(sessionData);

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[sb-session] Session created for:',
        sessionData.username,
        '| authType:',
        sessionData.authType
      );
    }

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
    return ctx.handleError(error);
  }
}

/**
 * GET /api/auth/sb-session - Get current session
 */
export async function GET() {
  const ctx = createRequestContext(ROUTE);

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

    // For soft users, enrich with keysDownloaded from DB so wallet page works after refresh
    let keysDownloaded: boolean | undefined;
    if (session.authType === 'soft' && session.hiveUsername) {
      try {
        const custodialUser = await prisma.custodialUser.findUnique({
          where: { hiveUsername: session.hiveUsername },
          select: { keysDownloaded: true },
        });
        keysDownloaded = custodialUser?.keysDownloaded ?? false;
      } catch {
        // Non-critical — wallet page will just show upgrade CTA
      }
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
        ...(keysDownloaded !== undefined && { keysDownloaded }),
      },
    });
  } catch (error) {
    return ctx.handleError(error);
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

  const ctx = createRequestContext(ROUTE);

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
    return ctx.handleError(error);
  }
}
