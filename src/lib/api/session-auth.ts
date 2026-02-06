/**
 * Session-based Authentication Helper
 *
 * Verifies user identity from the encrypted sb_session httpOnly cookie
 * rather than trusting the spoofable x-user-id header.
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { getHiveAvatarUrl } from '@/lib/utils/avatar';

const SESSION_COOKIE_NAME = 'sb_session';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const sessionSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  authType: z.enum(['hive', 'soft', 'firebase', 'guest']),
  hiveUsername: z.string().optional(),
  loginAt: z.number().optional(),
});

type SessionData = z.infer<typeof sessionSchema>;

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    return crypto.scryptSync('development-only-insecure-key', 'salt', 32);
  }

  const salt = process.env.SESSION_ENCRYPTION_SALT || 'sportsblock-session-salt';
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_ENCRYPTION_SALT) {
    console.warn(
      '[session-auth] SESSION_ENCRYPTION_SALT not set — using default salt. Set this env var to enable rotation.'
    );
  }

  return crypto.scryptSync(secret, salt, 32);
}

/**
 * Decrypt session data from cookie value.
 * Returns null if decryption fails or data is invalid.
 */
export function decryptSession(encrypted: string): SessionData | null {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encrypted, 'base64');

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      return null;
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedData = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString(
      'utf8'
    );

    const parsed = JSON.parse(decrypted);
    const result = sessionSchema.safeParse(parsed);

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

/**
 * Get authenticated user from the encrypted session cookie.
 *
 * In production: requires a valid sb_session cookie — the x-user-id header is ignored.
 * In development: falls back to x-user-id header if no session cookie exists
 *   (for easier testing with curl/Postman).
 *
 * Optionally enriches the returned user with profile data from Firestore.
 */
export async function getAuthenticatedUserFromSession(
  request: NextRequest,
  options?: { includeProfile?: boolean }
): Promise<{
  userId: string;
  username: string;
  authType?: 'hive' | 'soft' | 'firebase' | 'guest';
  hiveUsername?: string;
  displayName?: string;
  avatar?: string;
} | null> {
  // Try session cookie first (trusted source)
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  let userId: string | null = null;
  let username: string | null = null;
  let authType: SessionData['authType'] | undefined;
  let hiveUsername: string | undefined;

  if (sessionCookie?.value) {
    const session = decryptSession(sessionCookie.value);
    if (session) {
      userId = session.userId;
      username = session.username;
      authType = session.authType;
      hiveUsername = session.hiveUsername;
    }
  }

  // Development fallback: allow x-user-id header when explicitly enabled
  // Gated behind ALLOW_HEADER_AUTH to prevent use on Vercel preview deployments
  if (!userId && process.env.ALLOW_HEADER_AUTH === 'true') {
    const headerUserId = request.headers.get('x-user-id');
    if (headerUserId) {
      userId = headerUserId;
      username = headerUserId; // Will be overwritten by profile lookup below
    }
  }

  if (!userId) {
    return null;
  }

  // Optionally fetch profile data from Firestore
  if (options?.includeProfile) {
    // Hive users won't have a Firestore profile — use Hive avatar directly
    if (authType === 'hive') {
      const hiveUser = hiveUsername || username || '';
      return {
        userId,
        username: hiveUser,
        authType,
        hiveUsername,
        displayName: hiveUser,
        avatar: getHiveAvatarUrl(hiveUser),
      };
    }

    try {
      const db = getAdminDb();
      if (db) {
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (profileDoc.exists) {
          const data = profileDoc.data();
          return {
            userId,
            username: data?.username ?? username ?? '',
            authType,
            hiveUsername,
            displayName: data?.displayName,
            avatar: data?.avatarUrl,
          };
        }
      }
    } catch {
      // Fall through to basic response
    }
  }

  return {
    userId,
    username: username ?? '',
    authType,
    hiveUsername,
  };
}
