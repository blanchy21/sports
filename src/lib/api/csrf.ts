/**
 * CSRF Protection Utilities
 *
 * Provides protection against Cross-Site Request Forgery attacks
 * for mutation endpoints (POST, PUT, DELETE, PATCH).
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Error response for CSRF failures
 */
export function csrfError(message: string = 'CSRF validation failed') {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'CSRF_ERROR',
    },
    { status: 403 }
  );
}

/**
 * Get allowed origins from environment or defaults
 */
let cachedAllowedOrigins: string[] | null = null;

function getAllowedOrigins(): string[] {
  if (cachedAllowedOrigins) return cachedAllowedOrigins;

  const origins: string[] = [];
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    origins.push(...envOrigins.split(',').map((o) => o.trim()));
  } else {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }

  const productionUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (productionUrl) origins.push(productionUrl);

  cachedAllowedOrigins = origins;
  return origins;
}

/**
 * Validate CSRF for a request
 *
 * Checks:
 * 1. Origin header matches allowed origins (for CORS preflight and actual requests)
 * 2. Referer header is from same origin (fallback)
 *
 * @returns true if valid, false if CSRF attack detected
 */
export function validateCsrf(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // In production, require origin to be set for mutations
  const isProduction = process.env.NODE_ENV === 'production';

  // Get allowed origins (cached, includes production URL)
  const allowedOrigins = getAllowedOrigins();

  // Check Origin header (primary CSRF defense)
  if (origin) {
    const isAllowed = allowedOrigins.some((allowed) => {
      // Exact match or match origin pattern
      if (origin === allowed) return true;

      // Check if origin matches host
      try {
        const originUrl = new URL(origin);
        const allowedUrl = new URL(allowed);
        return originUrl.host === allowedUrl.host;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      // Also check against current host
      if (host) {
        try {
          const originUrl = new URL(origin);
          if (originUrl.host === host) {
            return true;
          }
        } catch {
          // Invalid origin URL
        }
      }
      return false;
    }

    return true;
  }

  // Fallback to Referer check if Origin is not present
  // (some browsers may not send Origin for same-origin requests)
  if (referer) {
    try {
      const refererUrl = new URL(referer);

      // Check against allowed origins
      const isAllowed = allowedOrigins.some((allowed) => {
        try {
          const allowedUrl = new URL(allowed);
          return refererUrl.host === allowedUrl.host;
        } catch {
          return false;
        }
      });

      if (isAllowed) return true;

      // Check against current host
      if (host && refererUrl.host === host) {
        return true;
      }
    } catch {
      // Invalid referer URL
    }
  }

  // In development, be more permissive if no origin/referer
  // (curl, Postman, etc. won't send these)
  if (!isProduction && !origin && !referer) {
    return true;
  }

  // In production, require origin or referer
  return false;
}

/**
 * CSRF protection wrapper for API route handlers
 *
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withCsrfProtection(request, async () => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   });
 * }
 * ```
 */
export async function withCsrfProtection(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const isValid = validateCsrf(request);

  if (!isValid) {
    const origin = request.headers.get('origin') || 'none';
    console.warn(`[CSRF] Blocked request from origin: ${origin}`);
    return csrfError('Request blocked: invalid origin');
  }

  return handler();
}

/**
 * Higher-order function to wrap an entire route handler with CSRF protection
 *
 * Usage:
 * ```ts
 * export const POST = csrfProtected(async (request: NextRequest) => {
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function csrfProtected(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    return withCsrfProtection(request, () => handler(request));
  };
}
