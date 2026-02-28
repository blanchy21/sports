/**
 * Tiered Cache System
 *
 * Orchestrates multi-layer caching with:
 * - L1: In-memory LRU cache (fast, local)
 * - L2: Redis cache (shared, persistent) - optional
 *
 * Request flow:
 * 1. Check L1 (memory) -> hit: return
 * 2. Check L2 (Redis) -> hit: populate L1, return
 * 3. Fetch from origin -> populate L1 and L2, return
 *
 * Supports stale-while-revalidate for graceful degradation.
 */

import { MemoryCache, MemoryCacheStats, CacheSetOptions } from './memory-cache';
import { RedisCache, RedisCacheStats, isRedisConfigured } from './redis-cache';

/**
 * Tiered cache configuration
 */
export interface TieredCacheConfig {
  /** Memory cache configuration */
  memory?: {
    maxEntries?: number;
    defaultTTL?: number;
  };
  /** Redis cache configuration */
  redis?: {
    keyPrefix?: string;
    defaultTTL?: number;
  };
  /** Enable stale-while-revalidate (default: true) */
  staleWhileRevalidate?: boolean;
  /** Maximum stale age in ms (default: 300000 = 5 minutes) */
  maxStaleAge?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TieredCacheConfig = {
  memory: {
    maxEntries: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
  },
  redis: {
    keyPrefix: 'sportsblock:',
    defaultTTL: 300, // 5 minutes in seconds
  },
  staleWhileRevalidate: true,
  maxStaleAge: 5 * 60 * 1000, // 5 minutes
};

/**
 * Cache get result with metadata
 */
export interface CacheResult<T> {
  value: T | null;
  hit: boolean;
  source: 'memory' | 'redis' | 'origin' | 'stale';
  stale: boolean;
  age: number;
}

/**
 * Combined cache statistics
 */
export interface TieredCacheStats {
  memory: MemoryCacheStats;
  redis: RedisCacheStats | null;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
}

/**
 * Tiered Cache Implementation
 */
export class TieredCache {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache | null = null;
  private config: TieredCacheConfig;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<TieredCacheConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      memory: { ...DEFAULT_CONFIG.memory, ...config.memory },
      redis: { ...DEFAULT_CONFIG.redis, ...config.redis },
      staleWhileRevalidate: config.staleWhileRevalidate ?? DEFAULT_CONFIG.staleWhileRevalidate,
      maxStaleAge: config.maxStaleAge ?? DEFAULT_CONFIG.maxStaleAge,
    };

    this.memoryCache = new MemoryCache({
      maxEntries: this.config.memory?.maxEntries,
      defaultTTL: this.config.memory?.defaultTTL,
      name: 'tiered-l1',
    });
  }

  /**
   * Initialize the cache (connects Redis if configured)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (isRedisConfigured()) {
        this.redisCache = new RedisCache({
          keyPrefix: this.config.redis?.keyPrefix,
          defaultTTL: this.config.redis?.defaultTTL,
        });
        await this.redisCache.connect();
      }
      this.isInitialized = true;
    })();

    return this.initPromise;
  }

  /**
   * Get a value from cache (checks L1 then L2)
   */
  async get<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();

    // L1: Check memory cache
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // L2: Check Redis cache
    if (this.redisCache?.isAvailable()) {
      const redisResult = await this.redisCache.get<T>(key);
      if (redisResult !== null) {
        // Populate L1 from L2
        this.memoryCache.set(key, redisResult);
        return redisResult;
      }
    }

    return null;
  }

  /**
   * Get with full metadata (for graceful degradation)
   */
  async getWithMeta<T>(key: string): Promise<CacheResult<T>> {
    await this.ensureInitialized();

    // L1: Check memory cache
    const memoryResult = this.memoryCache.getWithMeta<T>(key);
    if (memoryResult.hit) {
      return {
        value: memoryResult.value,
        hit: true,
        source: 'memory',
        stale: false,
        age: memoryResult.age,
      };
    }

    // L1 stale data (for stale-while-revalidate)
    if (memoryResult.stale && this.config.staleWhileRevalidate) {
      if (memoryResult.age <= (this.config.maxStaleAge || 0)) {
        return {
          value: memoryResult.value,
          hit: false,
          source: 'stale',
          stale: true,
          age: memoryResult.age,
        };
      }
    }

    // L2: Check Redis cache
    if (this.redisCache?.isAvailable()) {
      const redisResult = await this.redisCache.getWithMeta<T>(key);
      if (redisResult.hit) {
        // Populate L1 from L2
        this.memoryCache.set(key, redisResult.value);
        return {
          value: redisResult.value,
          hit: true,
          source: 'redis',
          stale: false,
          age: redisResult.age,
        };
      }
    }

    return {
      value: null,
      hit: false,
      source: 'origin',
      stale: false,
      age: 0,
    };
  }

  /**
   * Set a value in cache (writes to L1 and L2)
   */
  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    await this.ensureInitialized();

    // Write to L1
    this.memoryCache.set(key, value, options);

    // Write to L2 (async, don't await)
    if (this.redisCache?.isAvailable()) {
      const redisTTL = options.ttl
        ? Math.floor(options.ttl / 1000) // Convert ms to seconds
        : this.config.redis?.defaultTTL;

      this.redisCache
        .set(key, value, {
          ttl: redisTTL,
          tags: options.tags,
        })
        .catch((err) => {
          console.warn('[TieredCache] Redis write failed:', err);
        });
    }
  }

  /**
   * Get or fetch with automatic caching
   * Implements stale-while-revalidate pattern
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheSetOptions & { forceRefresh?: boolean } = {}
  ): Promise<{ value: T; cached: boolean; stale: boolean }> {
    await this.ensureInitialized();

    // Force refresh bypasses cache
    if (options.forceRefresh) {
      const value = await fetcher();
      await this.set(key, value, options);
      return { value, cached: false, stale: false };
    }

    // Check cache
    const result = await this.getWithMeta<T>(key);

    // Cache hit (fresh data)
    if (result.hit && result.value !== null) {
      return { value: result.value, cached: true, stale: false };
    }

    // Stale data available - return stale and revalidate in background
    if (result.stale && result.value !== null) {
      // Revalidate in background
      this.revalidate(key, fetcher, options).catch((err) => {
        console.warn('[TieredCache] Background revalidation failed:', err);
      });
      return { value: result.value, cached: true, stale: true };
    }

    // Cache miss - fetch from origin
    const value = await fetcher();
    await this.set(key, value, options);
    return { value, cached: false, stale: false };
  }

  /**
   * Delete a key from all cache layers
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.redisCache?.isAvailable()) {
      await this.redisCache.delete(key);
    }
  }

  /**
   * Invalidate by tag across all layers
   */
  async invalidateByTag(tag: string): Promise<number> {
    let count = this.memoryCache.invalidateByTag(tag);

    if (this.redisCache?.isAvailable()) {
      count += await this.redisCache.invalidateByTag(tag);
    }

    return count;
  }

  /**
   * Invalidate by pattern across all layers
   */
  async invalidateByPattern(pattern: string | RegExp): Promise<number> {
    let count = this.memoryCache.invalidateByPattern(pattern);

    if (this.redisCache?.isAvailable()) {
      const patternStr = typeof pattern === 'string' ? pattern : pattern.source;
      count += await this.redisCache.deleteByPattern(patternStr.replace(/\.\*/g, '*'));
    }

    return count;
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.redisCache?.isAvailable()) {
      await this.redisCache.deleteByPattern('*');
    }
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redisCache?.isAvailable() ?? false;
  }

  /**
   * Get combined statistics
   */
  getStats(): TieredCacheStats {
    const memoryStats = this.memoryCache.getStats();
    const redisStats = this.redisCache?.getStats() ?? null;

    const totalHits = memoryStats.hits + (redisStats?.hits ?? 0);
    const totalMisses = memoryStats.misses + (redisStats?.misses ?? 0);
    const totalRequests = totalHits + totalMisses;

    return {
      memory: memoryStats,
      redis: redisStats,
      totalHits,
      totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    };
  }

  /**
   * Destroy the cache (cleanup resources)
   */
  destroy(): void {
    this.memoryCache.destroy();
    // Redis doesn't need explicit cleanup in REST mode
  }

  /**
   * Background revalidation for stale-while-revalidate
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheSetOptions
  ): Promise<void> {
    const value = await fetcher();
    await this.set(key, value, options);
  }

  /**
   * Ensure cache is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Global tiered cache instance
let globalTieredCache: TieredCache | null = null;
let globalTieredCachePromise: Promise<TieredCache> | null = null;

/**
 * Get the global tiered cache instance (deduplicates concurrent init calls)
 */
export async function getTieredCache(): Promise<TieredCache> {
  if (globalTieredCache) return globalTieredCache;

  if (!globalTieredCachePromise) {
    globalTieredCachePromise = (async () => {
      const cache = new TieredCache();
      await cache.initialize();
      globalTieredCache = cache;
      return cache;
    })();
  }

  return globalTieredCachePromise;
}

/**
 * Convenience function for get-or-fetch pattern
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheSetOptions & { forceRefresh?: boolean }
): Promise<T> {
  const cache = await getTieredCache();
  const result = await cache.getOrFetch(key, fetcher, options);
  return result.value;
}

// Re-export types
export type { MemoryCacheStats, CacheSetOptions } from './memory-cache';
export type { RedisCacheStats } from './redis-cache';
export { MemoryCache, getMemoryCache, memoize } from './memory-cache';
export { RedisCache, getRedisCache, isRedisConfigured } from './redis-cache';
