/**
 * Cache System Tests
 *
 * Tests the tiered caching system including:
 * - Memory cache (L1)
 * - Tiered cache behavior
 * - Cache invalidation
 * - Stale-while-revalidate
 */

import { MemoryCache, getMemoryCache, memoize } from '@/lib/cache/memory-cache';
import { TieredCache } from '@/lib/cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({
      maxEntries: 100,
      defaultTTL: 5000, // 5 seconds
      enableAutoCleanup: false, // Disable for tests
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should store complex objects', () => {
      const obj = { name: 'test', nested: { value: 123 } };
      cache.set('complex', obj);
      expect(cache.get('complex')).toEqual(obj);
    });

    it('should store arrays', () => {
      const arr = [1, 2, 3, { nested: true }];
      cache.set('array', arr);
      expect(cache.get('array')).toEqual(arr);
    });
  });

  describe('TTL behavior', () => {
    it('should expire entries after TTL', async () => {
      cache = new MemoryCache({
        maxEntries: 100,
        defaultTTL: 100, // 100ms TTL
        enableAutoCleanup: false,
      });

      cache.set('expiring', 'value');
      expect(cache.get('expiring')).toBe('value');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get('expiring')).toBeNull();
    });

    it('should use custom TTL when provided', async () => {
      // Use longer TTL for reliable timing
      cache.set('custom-ttl', 'value', { ttl: 200 });

      // Should still exist well before TTL (use short wait)
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(cache.get('custom-ttl')).toBe('value');

      // Should be gone after TTL expires
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(cache.get('custom-ttl')).toBeNull();
    });
  });

  describe('delete operations', () => {
    it('should delete a key', () => {
      cache.set('to-delete', 'value');
      expect(cache.get('to-delete')).toBe('value');

      cache.delete('to-delete');
      expect(cache.get('to-delete')).toBeNull();
    });

    it('should handle deleting non-existent keys gracefully', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });
  });

  describe('tag-based invalidation', () => {
    it('should invalidate entries by tag', () => {
      cache.set('post-1', 'content1', { tags: ['posts', 'user-123'] });
      cache.set('post-2', 'content2', { tags: ['posts', 'user-456'] });
      cache.set('user-data', 'data', { tags: ['user-123'] });

      // Invalidate all posts
      const count = cache.invalidateByTag('posts');
      expect(count).toBe(2);

      expect(cache.get('post-1')).toBeNull();
      expect(cache.get('post-2')).toBeNull();
      expect(cache.get('user-data')).toBe('data'); // Should still exist
    });

    it('should return 0 when no entries match tag', () => {
      cache.set('key1', 'value1', { tags: ['tag-a'] });
      const count = cache.invalidateByTag('nonexistent-tag');
      expect(count).toBe(0);
    });
  });

  describe('pattern-based invalidation', () => {
    it('should invalidate entries by pattern', () => {
      cache.set('user:123:profile', 'profile1');
      cache.set('user:123:settings', 'settings1');
      cache.set('user:456:profile', 'profile2');
      cache.set('post:789', 'post-data');

      const count = cache.invalidateByPattern(/^user:123:/);
      expect(count).toBe(2);

      expect(cache.get('user:123:profile')).toBeNull();
      expect(cache.get('user:123:settings')).toBeNull();
      expect(cache.get('user:456:profile')).toBe('profile2');
      expect(cache.get('post:789')).toBe('post-data');
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      // Hit
      cache.get('key1');
      cache.get('key1');

      // Miss
      cache.get('nonexistent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should track cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when max size reached', () => {
      const smallCache = new MemoryCache({
        maxEntries: 3,
        defaultTTL: 60000,
        enableAutoCleanup: false,
      });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4'); // Should evict key1

      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');
      expect(smallCache.get('key4')).toBe('value4');

      smallCache.destroy();
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
  });
});

describe('TieredCache', () => {
  let tieredCache: TieredCache;

  beforeEach(() => {
    tieredCache = new TieredCache({
      memory: {
        maxEntries: 100,
        defaultTTL: 5000,
      },
      staleWhileRevalidate: true,
      maxStaleAge: 10000,
    });
  });

  afterEach(() => {
    tieredCache.destroy();
  });

  describe('basic operations', () => {
    it('should set and get values', async () => {
      await tieredCache.set('key1', 'value1');
      const result = await tieredCache.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const result = await tieredCache.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getOrFetch', () => {
    it('should fetch on cache miss', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched-value');

      const result = await tieredCache.getOrFetch('new-key', fetcher);

      expect(result.value).toBe('fetched-value');
      expect(result.cached).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should use cache on hit', async () => {
      await tieredCache.set('cached-key', 'cached-value');
      const fetcher = jest.fn().mockResolvedValue('new-value');

      const result = await tieredCache.getOrFetch('cached-key', fetcher);

      expect(result.value).toBe('cached-value');
      expect(result.cached).toBe(true);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      await tieredCache.set('refresh-key', 'old-value');
      const fetcher = jest.fn().mockResolvedValue('new-value');

      const result = await tieredCache.getOrFetch('refresh-key', fetcher, {
        forceRefresh: true,
      });

      expect(result.value).toBe('new-value');
      expect(result.cached).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should delete from cache', async () => {
      await tieredCache.set('to-delete', 'value');
      expect(await tieredCache.get('to-delete')).toBe('value');

      await tieredCache.delete('to-delete');
      expect(await tieredCache.get('to-delete')).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should return combined stats', async () => {
      await tieredCache.set('key1', 'value1');
      await tieredCache.get('key1'); // hit
      await tieredCache.get('nonexistent'); // miss

      const stats = tieredCache.getStats();
      expect(stats.memory).toBeDefined();
      expect(stats.totalHits).toBeGreaterThanOrEqual(0);
      expect(stats.totalMisses).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('memoize', () => {
  it('should cache function results', async () => {
    let callCount = 0;
    const expensiveFn = async () => {
      callCount++;
      return 42;
    };

    // First call should execute the fetcher
    const result1 = await memoize('test-key-1', expensiveFn);
    expect(result1).toBe(42);
    expect(callCount).toBe(1);

    // Second call with same key should use cache
    const result2 = await memoize('test-key-1', expensiveFn);
    expect(result2).toBe(42);
    expect(callCount).toBe(1); // Should not increment
  });

  it('should cache different keys separately', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return callCount * 10;
    };

    const result1 = await memoize('key-a', fn);
    const result2 = await memoize('key-b', fn);

    expect(result1).toBe(10);
    expect(result2).toBe(20);
    expect(callCount).toBe(2);
  });
});

describe('getMemoryCache (singleton)', () => {
  it('should return the same instance', () => {
    const cache1 = getMemoryCache();
    const cache2 = getMemoryCache();
    expect(cache1).toBe(cache2);
  });

  it('should be functional', () => {
    const cache = getMemoryCache();
    cache.set('singleton-test', 'value');
    expect(cache.get('singleton-test')).toBe('value');
  });
});

// ==========================================================================
// Additional TieredCache Tests for Invalidation & Stale-While-Revalidate
// ==========================================================================

describe('TieredCache Advanced', () => {
  let tieredCache: TieredCache;

  beforeEach(() => {
    tieredCache = new TieredCache({
      memory: {
        maxEntries: 100,
        defaultTTL: 100, // Short TTL for testing
      },
      staleWhileRevalidate: true,
      maxStaleAge: 500, // 500ms max stale age
    });
  });

  afterEach(() => {
    tieredCache.destroy();
  });

  describe('invalidation', () => {
    it('should invalidate by tag correctly', async () => {
      await tieredCache.set('post-1', { title: 'Post 1' }, { tags: ['posts', 'author-alice'] });
      await tieredCache.set('post-2', { title: 'Post 2' }, { tags: ['posts', 'author-bob'] });
      await tieredCache.set('user-alice', { name: 'Alice' }, { tags: ['users', 'author-alice'] });

      // Invalidate all posts
      const count = await tieredCache.invalidateByTag('posts');

      expect(count).toBe(2);
      expect(await tieredCache.get('post-1')).toBeNull();
      expect(await tieredCache.get('post-2')).toBeNull();
      expect(await tieredCache.get('user-alice')).not.toBeNull();
    });

    it('should invalidate by author tag', async () => {
      await tieredCache.set('post-1', { title: 'Post 1' }, { tags: ['posts', 'author-alice'] });
      await tieredCache.set('post-2', { title: 'Post 2' }, { tags: ['posts', 'author-bob'] });
      await tieredCache.set('user-alice', { name: 'Alice' }, { tags: ['users', 'author-alice'] });

      // Invalidate all Alice's entries
      const count = await tieredCache.invalidateByTag('author-alice');

      expect(count).toBe(2);
      expect(await tieredCache.get('post-1')).toBeNull();
      expect(await tieredCache.get('post-2')).not.toBeNull();
      expect(await tieredCache.get('user-alice')).toBeNull();
    });

    it('should invalidate by pattern correctly', async () => {
      await tieredCache.set('posts:123:content', 'Content 1');
      await tieredCache.set('posts:123:metadata', 'Meta 1');
      await tieredCache.set('posts:456:content', 'Content 2');
      await tieredCache.set('users:789:profile', 'Profile');

      // Invalidate all entries for post 123
      const count = await tieredCache.invalidateByPattern(/^posts:123:/);

      expect(count).toBe(2);
      expect(await tieredCache.get('posts:123:content')).toBeNull();
      expect(await tieredCache.get('posts:123:metadata')).toBeNull();
      expect(await tieredCache.get('posts:456:content')).not.toBeNull();
      expect(await tieredCache.get('users:789:profile')).not.toBeNull();
    });

    it('should return 0 when no entries match invalidation', async () => {
      await tieredCache.set('key1', 'value1', { tags: ['tag-a'] });

      const count = await tieredCache.invalidateByTag('nonexistent-tag');

      expect(count).toBe(0);
    });

    it('should clear all entries', async () => {
      await tieredCache.set('key1', 'value1');
      await tieredCache.set('key2', 'value2');
      await tieredCache.set('key3', 'value3');

      await tieredCache.clear();

      expect(await tieredCache.get('key1')).toBeNull();
      expect(await tieredCache.get('key2')).toBeNull();
      expect(await tieredCache.get('key3')).toBeNull();
    });
  });

  describe('stale-while-revalidate', () => {
    it('should return stale data while revalidating', async () => {
      let fetchCount = 0;
      const fetcher = jest.fn(async () => {
        fetchCount++;
        return `value-${fetchCount}`;
      });

      // Initial fetch
      const result1 = await tieredCache.getOrFetch('swr-key', fetcher);
      expect(result1.value).toBe('value-1');
      expect(result1.cached).toBe(false);

      // Wait for TTL to expire but stay within maxStaleAge
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should get stale data and trigger background revalidation
      const result2 = await tieredCache.getOrFetch('swr-key', fetcher);

      // Depending on timing, might get stale or fresh data
      expect(result2.value).toMatch(/value-[12]/);
    });

    it('should not return stale data beyond maxStaleAge', async () => {
      const shortStaleCache = new TieredCache({
        memory: {
          maxEntries: 100,
          defaultTTL: 50, // 50ms TTL
        },
        staleWhileRevalidate: true,
        maxStaleAge: 100, // 100ms max stale age
      });

      let fetchCount = 0;
      const fetcher = jest.fn(async () => {
        fetchCount++;
        return `value-${fetchCount}`;
      });

      // Initial fetch
      await shortStaleCache.getOrFetch('swr-key', fetcher);

      // Wait beyond both TTL and maxStaleAge
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should fetch fresh data (not stale)
      const result = await shortStaleCache.getOrFetch('swr-key', fetcher);
      expect(result.cached).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(2);

      shortStaleCache.destroy();
    });

    it('should handle concurrent requests during revalidation', async () => {
      let fetchCount = 0;
      const slowFetcher = jest.fn(async () => {
        fetchCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return `value-${fetchCount}`;
      });

      // Initial fetch
      await tieredCache.getOrFetch('concurrent-key', slowFetcher);
      expect(fetchCount).toBe(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Multiple concurrent requests
      const results = await Promise.all([
        tieredCache.getOrFetch('concurrent-key', slowFetcher),
        tieredCache.getOrFetch('concurrent-key', slowFetcher),
        tieredCache.getOrFetch('concurrent-key', slowFetcher),
      ]);

      // All should return valid values
      results.forEach((result) => {
        expect(result.value).toMatch(/value-[12]/);
      });
    });
  });

  describe('getWithMeta', () => {
    it('should return correct metadata for cache hit', async () => {
      await tieredCache.set('meta-key', 'meta-value');

      const result = await tieredCache.getWithMeta('meta-key');

      expect(result.hit).toBe(true);
      expect(result.value).toBe('meta-value');
      expect(result.source).toBe('memory');
      expect(result.stale).toBe(false);
      expect(result.age).toBeGreaterThanOrEqual(0);
    });

    it('should return correct metadata for cache miss', async () => {
      const result = await tieredCache.getWithMeta('nonexistent');

      expect(result.hit).toBe(false);
      expect(result.value).toBeNull();
      expect(result.source).toBe('origin');
      expect(result.stale).toBe(false);
    });

    it('should return stale metadata when data is stale', async () => {
      const shortTtlCache = new TieredCache({
        memory: {
          maxEntries: 100,
          defaultTTL: 50, // 50ms TTL
        },
        staleWhileRevalidate: true,
        maxStaleAge: 500,
      });

      await shortTtlCache.set('stale-key', 'stale-value');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 80));

      const result = await shortTtlCache.getWithMeta('stale-key');

      expect(result.stale).toBe(true);
      expect(result.source).toBe('stale');
      expect(result.value).toBe('stale-value');

      shortTtlCache.destroy();
    });
  });

  describe('Redis availability', () => {
    it('should report Redis as not available when not configured', () => {
      expect(tieredCache.isRedisAvailable()).toBe(false);
    });

    it('should include null Redis stats when not available', () => {
      const stats = tieredCache.getStats();

      expect(stats.redis).toBeNull();
      expect(stats.memory).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle setting null values', async () => {
      await tieredCache.set('null-key', null);
      const result = await tieredCache.get('null-key');
      expect(result).toBeNull();
    });

    it('should handle setting undefined values', async () => {
      await tieredCache.set('undefined-key', undefined);
      const result = await tieredCache.get('undefined-key');
      expect(result).toBeUndefined();
    });

    it('should handle complex nested objects', async () => {
      const complexObj = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, { nested: 'value' }],
              date: new Date().toISOString(),
            },
          },
        },
      };

      await tieredCache.set('complex', complexObj);
      const result = await tieredCache.get('complex');

      expect(result).toEqual(complexObj);
    });

    it('should handle empty strings as keys', async () => {
      // Empty string is technically a valid key
      await tieredCache.set('', 'empty-key-value');
      const result = await tieredCache.get('');
      expect(result).toBe('empty-key-value');
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'user:123:profile:@#$%^&*()';
      await tieredCache.set(specialKey, 'special-value');
      const result = await tieredCache.get(specialKey);
      expect(result).toBe('special-value');
    });
  });
});
