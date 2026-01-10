/**
 * In-Memory LRU Cache
 *
 * Provides a fast, in-memory cache with LRU eviction and TTL support.
 * Designed as the L1 cache layer in the tiered caching system.
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  tags: string[];
  size?: number;
}

/**
 * Memory cache configuration
 */
export interface MemoryCacheConfig {
  /** Maximum number of entries (default: 1000) */
  maxEntries: number;
  /** Default TTL in milliseconds (default: 300000 = 5 minutes) */
  defaultTTL: number;
  /** Enable automatic cleanup interval (default: true) */
  enableAutoCleanup: boolean;
  /** Cleanup interval in milliseconds (default: 60000 = 1 minute) */
  cleanupInterval: number;
  /** Name for logging (optional) */
  name?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MemoryCacheConfig = {
  maxEntries: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  enableAutoCleanup: true,
  cleanupInterval: 60 * 1000, // 1 minute
};

/**
 * Cache statistics
 */
export interface MemoryCacheStats {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  expirations: number;
}

/**
 * Cache set options
 */
export interface CacheSetOptions {
  /** TTL in milliseconds (overrides default) */
  ttl?: number;
  /** Tags for group invalidation */
  tags?: string[];
}

/**
 * Cache get result
 */
export interface CacheGetResult<T> {
  value: T | null;
  hit: boolean;
  stale: boolean;
  age: number;
}

/**
 * LRU Memory Cache Implementation
 */
export class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: MemoryCacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };

  constructor(config: Partial<MemoryCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.expirations++;
      return null;
    }

    // Update access metadata (for LRU)
    entry.accessedAt = Date.now();
    entry.accessCount++;

    // Move to end of Map (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Get with metadata (for graceful degradation)
   */
  getWithMeta<T>(key: string): CacheGetResult<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return { value: null, hit: false, stale: false, age: 0 };
    }

    const now = Date.now();
    const age = now - entry.createdAt;
    const expired = now > entry.expiresAt;

    if (expired) {
      this.stats.expirations++;
      // Don't delete yet - return as stale for graceful degradation
      return { value: entry.value, hit: false, stale: true, age };
    }

    // Update access metadata
    entry.accessedAt = now;
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return { value: entry.value, hit: true, stale: false, age };
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, options: CacheSetOptions = {}): void {
    const ttl = options.ttl ?? this.config.defaultTTL;
    const now = Date.now();

    // Evict if at capacity
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttl,
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
      tags: options.tags || [],
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries with a specific tag
   */
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidateByPattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): MemoryCacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get current size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.stats.expirations++;
        count++;
      }
    }

    return count;
  }

  /**
   * Destroy the cache (stop auto cleanup)
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.cache.clear();
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    // Map iteration order is insertion order
    // First entry is the oldest (least recently used due to move-to-end on access)
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Unref to not prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

/**
 * Named cache registry for multiple cache instances
 */
export class MemoryCacheRegistry {
  private caches: Map<string, MemoryCache> = new Map();
  private defaultConfig: Partial<MemoryCacheConfig>;

  constructor(defaultConfig: Partial<MemoryCacheConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Get or create a named cache
   */
  getOrCreate(name: string, config?: Partial<MemoryCacheConfig>): MemoryCache {
    let cache = this.caches.get(name);

    if (!cache) {
      cache = new MemoryCache({
        ...this.defaultConfig,
        ...config,
        name,
      });
      this.caches.set(name, cache);
    }

    return cache;
  }

  /**
   * Get an existing cache
   */
  get(name: string): MemoryCache | undefined {
    return this.caches.get(name);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.forEach((cache) => cache.clear());
  }

  /**
   * Get stats for all caches
   */
  getAllStats(): Map<string, MemoryCacheStats> {
    const stats = new Map<string, MemoryCacheStats>();
    this.caches.forEach((cache, name) => {
      stats.set(name, cache.getStats());
    });
    return stats;
  }

  /**
   * Destroy all caches
   */
  destroyAll(): void {
    this.caches.forEach((cache) => cache.destroy());
    this.caches.clear();
  }
}

// Global cache instance
let globalMemoryCache: MemoryCache | null = null;

/**
 * Get the global memory cache instance
 */
export function getMemoryCache(): MemoryCache {
  if (!globalMemoryCache) {
    globalMemoryCache = new MemoryCache({
      maxEntries: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      name: 'global',
    });
  }
  return globalMemoryCache;
}

/**
 * Convenience function to get or set a cached value
 */
export async function memoize<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheSetOptions
): Promise<T> {
  const cache = getMemoryCache();
  const cached = cache.get<T>(key);

  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();
  cache.set(key, value, options);
  return value;
}
