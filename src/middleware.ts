import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/utils/rate-limit';

/**
 * Next.js Middleware
 *
 * Handles:
 * - API rate limiting
 * - Security headers (CSP applied via next.config.ts)
 */

// Routes that need rate limiting
const RATE_LIMITED_ROUTES = {
  // Read operations
  '/api/hive/posts': 'read',
  '/api/hive/comments': 'read',
  '/api/hive/account': 'read',
  '/api/crypto/prices': 'read',
  '/api/analytics': 'read',

  // Write operations
  '/api/hive/posting': 'write',

  // Real-time operations
  '/api/hive/realtime': 'realtime',
  '/api/hive/notifications': 'realtime',
} as const;

type RateLimitType = 'read' | 'write' | 'auth' | 'realtime';

function getRateLimitType(pathname: string): RateLimitType | null {
  // Check exact matches first
  for (const [route, type] of Object.entries(RATE_LIMITED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return type as RateLimitType;
    }
  }

  // Default rate limit for all /api/hive routes
  if (pathname.startsWith('/api/hive')) {
    return 'read';
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Determine rate limit type
  const rateLimitType = getRateLimitType(pathname);

  if (!rateLimitType) {
    return NextResponse.next();
  }

  // Get client identifier
  const clientId = getClientIdentifier(request);
  const rateLimitKey = `${clientId}:${rateLimitType}`;

  // Check rate limit
  const config = RATE_LIMITS[rateLimitType];
  const result = checkRateLimit(rateLimitKey, config);

  // Add rate limit headers to response
  const rateLimitHeaders = createRateLimitHeaders(
    result.remaining,
    result.reset,
    config.limit
  );

  if (!result.success) {
    // Rate limited - return 429
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          ...rateLimitHeaders,
        },
      }
    );
  }

  // Allow request and add rate limit headers
  const response = NextResponse.next();

  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
