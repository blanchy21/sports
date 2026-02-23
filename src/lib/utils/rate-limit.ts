/**
 * Distributed rate limiting utility using Upstash Redis
 *
 * Uses @upstash/ratelimit for production-ready distributed rate limiting
 * Falls back to in-memory rate limiting with LRU cache if Redis is unavailable
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

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

// In-memory fallback store using LRU cache to prevent unbounded memory growth
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// LRU cache configuration
const MAX_ENTRIES = 10000; // Maximum unique identifiers to track
const TTL_MS = 65 * 60 * 1000; // 65 minute TTL for entries (covers hourly rate limit windows with margin)

const inMemoryStore = new LRUCache<string, RateLimitEntry>({
  max: MAX_ENTRIES,
  ttl: TTL_MS,
  // Automatically update TTL on get
  updateAgeOnGet: true,
  // Allow stale entries to be returned while fetching
  allowStale: false,
});

/**
 * In-memory rate limit check (fallback)
 * Uses LRU cache for bounded memory usage
 */
function checkRateLimitInMemory(identifier: string, config: RateLimitConfig): RateLimitResult {
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

  // Increment count - need to re-set for LRU to update
  const newEntry = { count: entry.count + 1, resetTime: entry.resetTime };
  inMemoryStore.set(key, newEntry);
  return {
    success: true,
    remaining: config.limit - newEntry.count,
    reset: entry.resetTime,
  };
}

// Redis client singleton (lazy initialization)
let redisClient: Redis | null = null;
let redisAvailable: boolean | null = null;
let redisDownSince: number | null = null;
const REDIS_RETRY_AFTER_MS = 5 * 60 * 1000; // 5 minutes

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
  type: string = 'default',
  options?: { strict?: boolean }
): Promise<RateLimitResult> {
  // Try distributed rate limiting first
  // If Redis was marked down, retry after REDIS_RETRY_AFTER_MS
  if (
    redisAvailable === false &&
    redisDownSince &&
    Date.now() - redisDownSince > REDIS_RETRY_AFTER_MS
  ) {
    console.info('[RateLimit] Retrying Redis after cooldown period');
    redisAvailable = null;
    redisDownSince = null;
  }

  if (redisAvailable !== false) {
    const limiter = getRatelimiter(type, config);
    if (limiter) {
      try {
        const result = await limiter.limit(identifier);
        redisAvailable = true;
        redisDownSince = null;
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        };
      } catch (error) {
        // Redis failed, mark as unavailable and fall back
        console.error('[RateLimit] Redis error, falling back to in-memory:', error);
        redisAvailable = false;
        redisDownSince = Date.now();
      }
    }
  }

  // In strict mode, deny when Redis is unavailable rather than falling back
  if (options?.strict) {
    return { success: false, remaining: 0, reset: Date.now() + 60_000 };
  }

  // Fallback to in-memory rate limiting
  return checkRateLimitInMemory(identifier, config);
}

/**
 * Synchronous rate limit check (in-memory only)
 * Use this only when async is not possible (e.g., synchronous middleware)
 * @deprecated Prefer async checkRateLimit for distributed limiting
 */
export function checkRateLimitSync(identifier: string, config: RateLimitConfig): RateLimitResult {
  return checkRateLimitInMemory(identifier, config);
}

/**
 * Get client identifier from request
 * Prefers Vercel's non-spoofable header, then falls back to standard headers
 */
export function getClientIdentifier(request: Request): string {
  const headers = request.headers;

  // Prefer Vercel's platform-set header (cannot be spoofed by clients)
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to x-forwarded-for (spoofable, but better than nothing outside Vercel)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

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
  // Soft post/comment write operations - hourly windows
  softPosts: {
    limit: 10, // 10 posts per hour
    windowSeconds: 3600,
  },
  softComments: {
    limit: 30, // 30 comments per hour
    windowSeconds: 3600,
  },
  softLikes: {
    limit: 100, // 100 likes per hour
    windowSeconds: 3600,
  },
  softFollows: {
    limit: 50, // 50 follows per hour
    windowSeconds: 3600,
  },
  softSportsbites: {
    limit: 20, // 20 sportsbites per hour
    windowSeconds: 3600,
  },
  softReactions: {
    limit: 120, // 120 reactions per hour
    windowSeconds: 3600,
  },
  softPollVotes: {
    limit: 60, // 60 poll votes per hour
    windowSeconds: 3600,
  },
  // Signing relay — 10 ops/min per user (serverless-safe, replaces in-memory limiter)
  signingRelay: {
    limit: 10,
    windowSeconds: 60,
  },
  // Account creation — 3 per day per user (normal users create exactly 1)
  accountCreation: {
    limit: 3,
    windowSeconds: 86400,
  },
  // Key download — 5 per hour (defense-in-depth for sensitive endpoint)
  keyDownload: {
    limit: 5,
    windowSeconds: 3600,
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
  redisDownSince = null;
  redisClient = null;
  ratelimiters.clear();
}
