/**
 * Distributed rate limiting utility using Upstash Redis
 *
 * Uses @upstash/ratelimit for production-ready distributed rate limiting
 * Falls back to in-memory rate limiting if Redis is unavailable
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// In-memory fallback store (used when Redis is unavailable)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically for in-memory fallback
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (entry.resetTime < now) {
        inMemoryStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't keep the process alive just for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * In-memory rate limit check (fallback)
 */
function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  const entry = inMemoryStore.get(key);

  // No existing entry or window expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs;
    inMemoryStore.set(key, { count: 1, resetTime });
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

// Redis client singleton (lazy initialization)
let redisClient: Redis | null = null;
let redisAvailable: boolean | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[RateLimit] Upstash Redis not configured, using in-memory fallback');
    redisAvailable = false;
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
    });
    return redisClient;
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis client:', error);
    redisAvailable = false;
    return null;
  }
}

// Ratelimit instances cache (one per config type)
const ratelimiters = new Map<string, Ratelimit>();

function getRatelimiter(type: string, config: RateLimitConfig): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  const key = `${type}:${config.limit}:${config.windowSeconds}`;
  let limiter = ratelimiters.get(key);

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      analytics: true,
      prefix: `sportsblock:ratelimit:${type}`,
    });
    ratelimiters.set(key, limiter);
  }

  return limiter;
}

/**
 * Check if a request should be rate limited (async, distributed)
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  type: string = 'default'
): Promise<RateLimitResult> {
  // Try distributed rate limiting first
  if (redisAvailable !== false) {
    const limiter = getRatelimiter(type, config);
    if (limiter) {
      try {
        const result = await limiter.limit(identifier);
        redisAvailable = true;
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        };
      } catch (error) {
        // Redis failed, mark as unavailable and fall back
        console.error('[RateLimit] Redis error, falling back to in-memory:', error);
        redisAvailable = false;
      }
    }
  }

  // Fallback to in-memory rate limiting
  return checkRateLimitInMemory(identifier, config);
}

/**
 * Synchronous rate limit check (in-memory only)
 * Use this only when async is not possible (e.g., synchronous middleware)
 * @deprecated Prefer async checkRateLimit for distributed limiting
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimitInMemory(identifier, config);
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

/**
 * Check if distributed rate limiting is available
 */
export function isDistributedRateLimitingAvailable(): boolean {
  return redisAvailable === true;
}

/**
 * Reset the Redis availability check (useful for testing)
 */
export function resetRedisAvailability(): void {
  redisAvailable = null;
  redisClient = null;
  ratelimiters.clear();
}
