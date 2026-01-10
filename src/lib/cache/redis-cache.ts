/**
 * Redis Cache Adapter
 *
 * Optional Redis cache layer for distributed caching.
 * Gracefully falls back to memory-only mode if Redis is unavailable.
 *
 * Requires REDIS_URL environment variable to be set.
 * Compatible with Redis, Upstash, and other Redis-compatible stores.
 */

/**
 * Redis cache configuration
 */
export interface RedisCacheConfig {
  /** Redis URL (from REDIS_URL env var) */
  url?: string;
  /** Key prefix for namespacing (default: 'sportsblock:') */
  keyPrefix: string;
  /** Default TTL in seconds (default: 300 = 5 minutes) */
  defaultTTL: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout: number;
  /** Command timeout in milliseconds (default: 2000) */
  commandTimeout: number;
  /** Enable TLS (auto-detected from URL) */
  tls?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RedisCacheConfig = {
  keyPrefix: 'sportsblock:',
  defaultTTL: 300, // 5 minutes
  connectTimeout: 5000,
  commandTimeout: 2000,
};

/**
 * Redis cache statistics
 */
export interface RedisCacheStats {
  connected: boolean;
  hits: number;
  misses: number;
  errors: number;
  lastError?: string;
  lastConnectedAt?: number;
}

/**
 * Cache entry for Redis (serializable)
 */
interface RedisEntry<T> {
  v: T; // value
  c: number; // created timestamp
  t: string[]; // tags
}

/**
 * Redis Cache Implementation
 *
 * Uses native fetch-based Redis HTTP API for Upstash compatibility.
 * Falls back gracefully when Redis is unavailable.
 */
export class RedisCache {
  private config: RedisCacheConfig;
  private stats: RedisCacheStats = {
    connected: false,
    hits: 0,
    misses: 0,
    errors: 0,
  };
  private isInitialized: boolean = false;
  private redisUrl: string | null = null;
  private restToken: string | null = null;

  constructor(config: Partial<RedisCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<boolean> {
    if (this.isInitialized) {
      return this.stats.connected;
    }

    this.isInitialized = true;

    // Get Redis URL from config or environment
    const url = this.config.url || process.env.REDIS_URL;

    if (!url) {
      console.debug('[RedisCache] No REDIS_URL configured, running in memory-only mode');
      return false;
    }

    try {
      // Parse URL to detect Upstash REST API
      const parsedUrl = new URL(url);

      // Check if it's Upstash REST API (contains upstash)
      if (parsedUrl.hostname.includes('upstash')) {
        // Extract REST URL and token for Upstash
        this.redisUrl = `https://${parsedUrl.hostname}`;
        this.restToken = parsedUrl.password;

        // Test connection
        const testResult = await this.executeCommand('PING');
        if (testResult === 'PONG') {
          this.stats.connected = true;
          this.stats.lastConnectedAt = Date.now();
          console.info('[RedisCache] Connected to Upstash Redis');
          return true;
        }
      } else {
        // Standard Redis - not supported in this implementation
        // Would require ioredis or similar package
        console.warn('[RedisCache] Standard Redis not supported, use Upstash for serverless');
        return false;
      }
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      console.warn('[RedisCache] Connection failed:', this.stats.lastError);
      return false;
    }

    return false;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.stats.connected;
  }

  /**
   * Get a value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.stats.connected) {
      return null;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const result = await this.executeCommand('GET', fullKey);

      if (result === null) {
        this.stats.misses++;
        return null;
      }

      const entry = this.deserialize<RedisEntry<T>>(result);
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.v;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      console.error('[RedisCache] GET error:', this.stats.lastError);
      return null;
    }
  }

  /**
   * Get with metadata for graceful degradation
   */
  async getWithMeta<T>(key: string): Promise<{
    value: T | null;
    hit: boolean;
    age: number;
    tags: string[];
  }> {
    if (!this.stats.connected) {
      return { value: null, hit: false, age: 0, tags: [] };
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const result = await this.executeCommand('GET', fullKey);

      if (result === null) {
        this.stats.misses++;
        return { value: null, hit: false, age: 0, tags: [] };
      }

      const entry = this.deserialize<RedisEntry<T>>(result);
      if (!entry) {
        this.stats.misses++;
        return { value: null, hit: false, age: 0, tags: [] };
      }

      this.stats.hits++;
      return {
        value: entry.v,
        hit: true,
        age: Date.now() - entry.c,
        tags: entry.t,
      };
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      return { value: null, hit: false, age: 0, tags: [] };
    }
  }

  /**
   * Set a value in Redis
   */
  async set<T>(
    key: string,
    value: T,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<boolean> {
    if (!this.stats.connected) {
      return false;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const ttl = options.ttl ?? this.config.defaultTTL;

      const entry: RedisEntry<T> = {
        v: value,
        c: Date.now(),
        t: options.tags || [],
      };

      const serialized = this.serialize(entry);
      await this.executeCommand('SET', fullKey, serialized, 'EX', ttl.toString());

      // Store tag index for tag-based invalidation
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          const tagKey = `${this.config.keyPrefix}tag:${tag}`;
          await this.executeCommand('SADD', tagKey, fullKey);
          await this.executeCommand('EXPIRE', tagKey, (ttl * 2).toString());
        }
      }

      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      console.error('[RedisCache] SET error:', this.stats.lastError);
      return false;
    }
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<boolean> {
    if (!this.stats.connected) {
      return false;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      await this.executeCommand('DEL', fullKey);
      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  /**
   * Invalidate all entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    if (!this.stats.connected) {
      return 0;
    }

    try {
      const tagKey = `${this.config.keyPrefix}tag:${tag}`;

      // Get all keys with this tag
      const keys = await this.executeCommand('SMEMBERS', tagKey);

      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return 0;
      }

      // Delete all keys
      for (const key of keys) {
        await this.executeCommand('DEL', key);
      }

      // Delete the tag index
      await this.executeCommand('DEL', tagKey);

      return keys.length;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      return 0;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.stats.connected) {
      return 0;
    }

    try {
      const fullPattern = this.config.keyPrefix + pattern;
      const keys = await this.executeCommand('KEYS', fullPattern);

      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return 0;
      }

      for (const key of keys) {
        await this.executeCommand('DEL', key);
      }

      return keys.length;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.stats.connected) {
      return false;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const result = await this.executeCommand('EXISTS', fullKey);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get TTL for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    if (!this.stats.connected) {
      return -1;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const result = await this.executeCommand('TTL', fullKey);
      return typeof result === 'number' ? result : -1;
    } catch {
      return -1;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): RedisCacheStats {
    return { ...this.stats };
  }

  /**
   * Execute a Redis command via REST API
   */
  private async executeCommand(...args: string[]): Promise<unknown> {
    if (!this.redisUrl || !this.restToken) {
      throw new Error('Redis not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.commandTimeout
    );

    try {
      const response = await fetch(`${this.redisUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.restToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Redis command failed: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Serialize value for Redis storage
   */
  private serialize<T>(value: T): string {
    return JSON.stringify(value, (_, v) => {
      // Handle BigInt
      if (typeof v === 'bigint') {
        return { __bigint__: v.toString() };
      }
      // Handle Date
      if (v instanceof Date) {
        return { __date__: v.toISOString() };
      }
      return v;
    });
  }

  /**
   * Deserialize value from Redis storage
   */
  private deserialize<T>(value: string | unknown): T | null {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return JSON.parse(str, (_, v) => {
        // Handle BigInt
        if (v && typeof v === 'object' && '__bigint__' in v) {
          return BigInt(v.__bigint__);
        }
        // Handle Date
        if (v && typeof v === 'object' && '__date__' in v) {
          return new Date(v.__date__);
        }
        return v;
      });
    } catch {
      return null;
    }
  }
}

// Global Redis cache instance
let globalRedisCache: RedisCache | null = null;

/**
 * Get the global Redis cache instance
 * Automatically attempts to connect on first call
 */
export async function getRedisCache(): Promise<RedisCache> {
  if (!globalRedisCache) {
    globalRedisCache = new RedisCache();
    await globalRedisCache.connect();
  }
  return globalRedisCache;
}

/**
 * Check if Redis is available without initializing
 */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
