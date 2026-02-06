/**
 * Cron Job Authentication
 *
 * Secure authentication for cron job endpoints.
 * In development, allows a test secret for local testing.
 */

import { headers } from 'next/headers';
import crypto from 'crypto';

const CRON_SECRET = process.env.CRON_SECRET;

// Allow a test secret in development for local testing
// You can call: curl -H "Authorization: Bearer dev-test-secret" http://localhost:3000/api/cron/...
const DEV_TEST_SECRET = 'dev-test-secret';

/**
 * Verify the request is from Vercel Cron or an authorized source.
 *
 * In production: Requires CRON_SECRET to be set and match.
 * In development: Accepts CRON_SECRET OR a test secret for easy testing.
 *
 * @returns true if authorized, false otherwise
 */
export async function verifyCronRequest(): Promise<boolean> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  // No auth header provided
  if (!authHeader) {
    return false;
  }

  // Extract the token from "Bearer <token>"
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  // In production, only accept CRON_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!CRON_SECRET) {
      console.error('[Cron Auth] CRON_SECRET not configured in production');
      return false;
    }
    try {
      const a = Buffer.from(token);
      const b = Buffer.from(CRON_SECRET);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // In development, accept CRON_SECRET or dev test secret
  if (CRON_SECRET && token === CRON_SECRET) {
    return true;
  }

  if (token === DEV_TEST_SECRET) {
    console.log('[Cron Auth] Using development test secret');
    return true;
  }

  return false;
}

/**
 * Create unauthorized response for cron endpoints
 */
export function createUnauthorizedResponse() {
  return {
    success: false,
    error: 'Unauthorized',
    message: 'Invalid or missing cron secret',
  };
}
