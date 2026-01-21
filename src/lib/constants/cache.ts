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

/**
 * Calculate dynamic stale time based on post age.
 * Older posts rarely change, so they can be cached longer.
 *
 * @param postDate - The creation date of the post
 * @returns Stale time in milliseconds
 */
export function getPostStaleTime(postDate: Date | string | null | undefined): number {
  if (!postDate) {
    return STALE_TIMES.STANDARD;
  }

  const date = typeof postDate === 'string' ? new Date(postDate) : postDate;
  const ageMs = Date.now() - date.getTime();
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  // Posts in payout window (first 7 days) - votes/rewards still changing
  if (ageMs < 7 * DAY) {
    return STALE_TIMES.REALTIME; // 2 minutes
  }

  // Posts 1 week to 1 month old - occasionally receive comments
  if (ageMs < 30 * DAY) {
    return STALE_TIMES.STANDARD; // 5 minutes
  }

  // Posts 1-3 months old - rarely change
  if (ageMs < 90 * DAY) {
    return STALE_TIMES.LONG; // 30 minutes
  }

  // Posts older than 3 months - virtually never change
  return 60 * MINUTE; // 1 hour
}

/**
 * Get stale time for a list of posts based on the most recent post.
 * Uses the freshest post's stale time to ensure timely updates.
 *
 * @param posts - Array of posts with created date
 * @returns Stale time in milliseconds
 */
export function getPostListStaleTime(
  posts: Array<{ created?: string | Date; createdAt?: string | Date }> | null | undefined
): number {
  if (!posts || posts.length === 0) {
    return STALE_TIMES.STANDARD;
  }

  // Find the most recent post
  const mostRecentDate = posts.reduce<Date | null>((latest, post) => {
    const dateValue = post.created || post.createdAt;
    if (!dateValue) return latest;

    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (!latest || date > latest) {
      return date;
    }
    return latest;
  }, null);

  return getPostStaleTime(mostRecentDate);
}
