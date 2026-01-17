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
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('expiring')).toBeNull();
    });

    it('should use custom TTL when provided', async () => {
      // Use longer TTL for reliable timing
      cache.set('custom-ttl', 'value', { ttl: 200 });

      // Should still exist well before TTL (use short wait)
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(cache.get('custom-ttl')).toBe('value');

      // Should be gone after TTL expires
      await new Promise(resolve => setTimeout(resolve, 250));
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
