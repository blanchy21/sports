/**
 * Simple in-memory rate limiter for API routes
 *
 * For production, consider using Redis or a dedicated rate limiting service.
 * This implementation is suitable for single-instance deployments or as a
 * first line of defense.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let cleanupScheduled = false;

function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

export interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  // Optional prefix for the rate limit key
  prefix?: string;
}

export interface RateLimitResult {
  // Whether the request is allowed
  allowed: boolean;
  // Number of remaining requests in the window
  remaining: number;
  // When the window resets (timestamp)
  resetAt: number;
  // Current count
  count: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  scheduleCleanup();

  const key = config.prefix ? `${config.prefix}:${identifier}` : identifier;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  // No existing entry or window has expired
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
      count: 1,
    };
  }

  // Entry exists and window is still active
  const newCount = entry.count + 1;
  const allowed = newCount <= config.maxRequests;

  if (allowed) {
    entry.count = newCount;
    rateLimitStore.set(key, entry);
  }

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - newCount),
    resetAt: entry.resetAt,
    count: newCount,
  };
}

/**
 * Pre-configured rate limits for different actions
 */
export const RATE_LIMITS = {
  // Posts: 10 per hour
  posts: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: 'posts',
  },
  // Comments: 30 per hour
  comments: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: 'comments',
  },
  // Likes: 100 per hour
  likes: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: 'likes',
  },
  // Follows: 50 per hour
  follows: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: 'follows',
  },
  // General API: 100 per minute
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    prefix: 'api',
  },
} as const;

/**
 * Helper to create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}
