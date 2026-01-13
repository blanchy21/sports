/**
 * In-memory rate limiting utility
 *
 * For production with multiple instances, consider using:
 * - Upstash Redis (@upstash/ratelimit)
 * - Vercel KV
 * - External rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

// In-memory store (works for single instance, not distributed)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't keep the process alive just for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; reset: number } {
  startCleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  const entry = rateLimitStore.get(key);

  // No existing entry or window expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.limit - 1,
      reset: resetTime,
    };
  }

  // Within window, check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Increment count
  entry.count += 1;
  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 * Uses IP address with fallback to forwarded headers
 */
export function getClientIdentifier(request: Request): string {
  const headers = request.headers;

  // Check various headers for client IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Fallback
  return 'anonymous';
}

/**
 * Rate limit configurations for different route types
 * Higher limits for development, can be reduced for production
 */
const isDevelopment = process.env.NODE_ENV === 'development';

export const RATE_LIMITS = {
  // Read operations - very lenient to allow parallel requests
  read: {
    limit: isDevelopment ? 500 : 200, // 500/min dev, 200/min prod
    windowSeconds: 60,
  },
  // Write operations - stricter
  write: {
    limit: isDevelopment ? 50 : 30, // 50/min dev, 30/min prod
    windowSeconds: 60,
  },
  // Auth operations - strict to prevent brute force
  auth: {
    limit: 20, // 20 attempts per minute
    windowSeconds: 60,
  },
  // Real-time/streaming - moderate
  realtime: {
    limit: isDevelopment ? 100 : 60, // 100/min dev, 60/min prod
    windowSeconds: 60,
  },
} as const;

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  remaining: number,
  reset: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
  };
}
