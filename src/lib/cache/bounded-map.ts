/**
 * Bounded Map Cache Utilities
 *
 * Shared helpers for in-memory Map caches with size limits.
 */

/** Set a value in a Map, evicting the oldest entry if at capacity. */
export function boundedCacheSet<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number): void {
  if (map.size >= maxSize) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

/** Remove expired entries from a Map using a predicate. */
export function cleanupExpired<K, V>(map: Map<K, V>, isExpired: (value: V) => boolean): void {
  for (const [key, value] of map.entries()) {
    if (isExpired(value)) map.delete(key);
  }
}
