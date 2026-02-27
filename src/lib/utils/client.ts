// Client-safe utilities barrel file
// Use this for imports in client components (no server-only dependencies)

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

// Hive blockchain utilities (client-safe)
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

// Avatar utilities
export { generateAvatarUrl, getAvatarUrl, type AvatarStyle } from './avatar';

// Image proxy utilities
export { shouldProxyImage, getProxyImageUrl, proxyImagesInContent } from './image-proxy';

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
