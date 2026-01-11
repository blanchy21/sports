/**
 * Centralized cache duration constants for React Query and API caching
 * All values are in milliseconds
 */

// Base time units
const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * React Query stale times - how long data is considered fresh
 */
export const STALE_TIMES = {
  /** Real-time data that changes frequently (votes, comments) */
  REALTIME: 2 * MINUTE,
  /** Standard data (posts, profiles) */
  STANDARD: 5 * MINUTE,
  /** Stable data that rarely changes (user settings, static content) */
  STABLE: 10 * MINUTE,
  /** Very stable data (community info, historical data) */
  LONG: 30 * MINUTE,
} as const;

/**
 * API cache durations - how long server-side cache is valid
 */
export const CACHE_DURATIONS = {
  /** Crypto prices - external API, moderate freshness */
  CRYPTO_PRICES: 10 * MINUTE,
  /** Sports events - changes infrequently */
  SPORTS_EVENTS: 30 * MINUTE,
  /** Hive posts - changes with new content */
  HIVE_POSTS: 5 * MINUTE,
  /** Analytics data - computed periodically */
  ANALYTICS: 15 * MINUTE,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default page size for lists */
  DEFAULT_PAGE_SIZE: 20,
  /** Page size for followers/following lists */
  SOCIAL_PAGE_SIZE: 50,
  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 100,
} as const;
