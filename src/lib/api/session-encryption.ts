/**
 * Shared session encryption key derivation.
 *
 * Used by both sb-session/route.ts (encryption) and session-auth.ts (decryption)
 * to guarantee the same key is derived in both places.
 */

import crypto from 'crypto';

export function getSessionEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    return crypto.scryptSync('development-only-insecure-key', 'salt', 32);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_ENCRYPTION_SALT) {
    throw new Error('SESSION_ENCRYPTION_SALT is required in production');
  }
  const salt = process.env.SESSION_ENCRYPTION_SALT || 'sportsblock-session-salt';

  return crypto.scryptSync(secret, salt, 32);
}
