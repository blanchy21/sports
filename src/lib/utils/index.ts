// Unified utilities index
// All utility functions consolidated here
//
// NOTE: For client components, import from '@/lib/utils/client' instead
// to avoid pulling in server-only dependencies (rate-limit, etc.)

// General formatting utilities (UI/display)
export {
  cn,
  formatDate,
  formatTime,
  formatDateTime,
  formatReadTime,
  truncateText,
  slugify,
  formatUSD,
  formatCrypto,
  formatPercentage,
  formatLargeNumber,
  calculateUSDValue,
  formatCryptoWithUSD,
} from './formatting';

// Hive blockchain utilities
export {
  calculateReputation,
  formatReputation,
  generatePermlink,
  generateUniquePermlink,
  parseAsset,
  formatAsset,
  calculatePendingPayout,
  isInPayoutWindow,
  getTimeUntilPayout,
  formatTimeUntilPayout,
  calculateVoteWeight,
  getUserVote,
  parseJsonMetadata,
  isFromSportsblockApp,
  getSportCategory,
  calculateRCPercentage,
  formatResourceCredits,
  hasEnoughRC,
  vestingSharesToHive,
  generateHiveUrl,
  generateHiveSignerVoteUrl,
  generateHiveSignerPostUrl,
  isValidHiveUsername,
  truncateText as truncateHiveText,
  HiveError,
  handleHiveError,
} from './hive';

// API retry utilities
export { retryWithBackoff, fetchWithRetry, type RetryOptions } from './api-retry';

// Avatar utilities
export { generateAvatarUrl, getAvatarUrl, type AvatarStyle } from './avatar';

// Circuit breaker pattern
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitOpenError,
  CircuitState,
  getCircuitBreakerRegistry,
  withCircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
} from './circuit-breaker';

// Error reporting
export {
  reportError,
  reportWarning,
  reportApiError,
  reportErrorBoundary,
  setupGlobalErrorHandlers,
  type ErrorContext,
  type ErrorSeverity,
  type ErrorReport,
} from './error-reporting';

// Image proxy utilities
export { shouldProxyImage, getProxyImageUrl, proxyImagesInContent } from './image-proxy';

// Rate limiting
export {
  checkRateLimit,
  checkRateLimitSync,
  getClientIdentifier,
  createRateLimitHeaders,
  isDistributedRateLimitingAvailable,
  resetRedisAvailability,
  RATE_LIMITS,
} from './rate-limit';

export {
  RateLimiter,
  TokenBucket,
  RateLimitError,
  RateLimiterRegistry,
  RateLimitPresets,
  getRateLimiterRegistry,
  withRateLimit,
  type TokenBucketConfig,
  type RateLimiterStats,
} from './rate-limiter';

// Request deduplication
export {
  deduplicateRequest,
  deduplicateFetch,
  clearPendingRequests,
  getPendingRequestCount,
  getPendingRequestKeys,
} from './request-deduplication';

// Result type utilities
export type { Result, ApiError, ApiMeta, ErrorCode } from './result';

// Sanitization
export {
  sanitizeHtml,
  sanitizePostContent,
  sanitizeComment,
  stripHtml,
  hasSuspiciousContent,
  validateUrl,
  validateImageUrl,
  isTrustedImageHost,
} from './sanitize';
