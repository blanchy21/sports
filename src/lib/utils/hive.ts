import { logger } from '@/lib/logger';

// Utility functions for Hive blockchain operations

/**
 * Convert Hive reputation from raw format to readable format
 * @param rawReputation - Raw reputation number from Hive
 * @returns Readable reputation score
 */
export function calculateReputation(rawReputation: string | number): number {
  if (!rawReputation || rawReputation === '0') return 0;

  const rep = typeof rawReputation === 'string' ? parseInt(rawReputation) : rawReputation;
  if (rep === 0) return 25;

  const log = Math.log10(Math.abs(rep));
  return Math.max(0, (log - 9) * 9 + 25);
}

/**
 * Convert reputation to display format
 * @param reputation - Reputation score
 * @returns Formatted reputation string
 */
export function formatReputation(reputation: number): string {
  if (reputation < 25) return '25';
  if (reputation < 50) return '50';
  if (reputation < 75) return '75';
  return '100';
}

/**
 * Generate a permlink from title
 * @param title - Post title
 * @returns URL-safe permlink
 */
export function generatePermlink(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 255) // Limit length
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique permlink by appending timestamp if needed
 * @param title - Post title
 * @param existingPermlinks - Array of existing permlinks to check against
 * @returns Unique permlink
 */
export function generateUniquePermlink(title: string, existingPermlinks: string[] = []): string {
  let permlink = generatePermlink(title);
  let counter = 1;

  while (existingPermlinks.includes(permlink)) {
    permlink = `${generatePermlink(title)}-${counter}`;
    counter++;
  }

  return permlink;
}

/**
 * Parse Hive asset string (e.g., "1.000 HIVE")
 * @param asset - Asset string from Hive
 * @returns Object with amount and symbol
 */
export function parseAsset(asset: string): { amount: number; symbol: string } {
  const match = asset.match(/^([\d.]+)\s+([A-Z]+)$/);
  if (!match) return { amount: 0, symbol: '' };

  return {
    amount: parseFloat(match[1]),
    symbol: match[2],
  };
}

/**
 * Format Hive asset for display
 * @param amount - Amount to format
 * @param symbol - Symbol (HIVE, HBD, etc.)
 * @param decimals - Number of decimal places (default: 3)
 * @returns Formatted asset string
 */
export function formatAsset(amount: number, symbol: string, decimals: number = 3): string {
  return `${amount.toFixed(decimals)} ${symbol}`;
}

/**
 * Calculate pending payout from Hive post
 * @param post - Hive post object
 * @returns Pending payout amount
 */
export function calculatePendingPayout(post: { pending_payout_value?: string }): number {
  if (!post.pending_payout_value) return 0;

  const asset = parseAsset(post.pending_payout_value);
  return asset.amount;
}

/**
 * Check if post is in payout window
 * @param post - Hive post object
 * @returns True if post is still earning rewards
 */
export function isInPayoutWindow(post: { cashout_time?: string }): boolean {
  if (!post.cashout_time) return false;

  const cashoutTime = new Date(post.cashout_time);
  const now = new Date();

  return cashoutTime > now;
}

/**
 * Get time until payout
 * @param post - Hive post object
 * @returns Time until payout in milliseconds
 */
export function getTimeUntilPayout(post: { cashout_time?: string }): number {
  if (!post.cashout_time) return 0;

  const cashoutTime = new Date(post.cashout_time);
  const now = new Date();

  return Math.max(0, cashoutTime.getTime() - now.getTime());
}

/**
 * Format time until payout
 * @param milliseconds - Time in milliseconds
 * @returns Formatted time string
 */
export function formatTimeUntilPayout(milliseconds: number): string {
  if (milliseconds <= 0) return 'Paid out';

  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Calculate vote weight percentage
 * @param rshares - Rshares value from vote
 * @param totalVotingWeight - Total voting weight of the post
 * @returns Vote weight percentage (0-100)
 */
export function calculateVoteWeight(rshares: string, totalVotingWeight: string): number {
  const rsharesNum = parseFloat(rshares);
  const totalWeight = parseFloat(totalVotingWeight);

  if (totalWeight === 0) return 0;

  return Math.min(100, (rsharesNum / totalWeight) * 100);
}

/**
 * Check if user has voted on a post
 * @param post - Hive post object
 * @param username - Username to check
 * @returns Vote object if user voted, null otherwise
 */
export function getUserVote(
  post: { active_votes?: Array<{ voter: string; [key: string]: unknown }> },
  username: string
): { voter: string; [key: string]: unknown } | null {
  if (!post.active_votes) return null;

  return post.active_votes.find((vote) => vote.voter === username) || null;
}

/**
 * Parse JSON metadata from Hive post
 * @param jsonMetadata - JSON metadata string
 * @returns Parsed metadata object
 */
export function parseJsonMetadata(json: string): Record<string, unknown> {
  try {
    return json ? JSON.parse(json) : {};
  } catch (err) {
    logger.warn('Failed to parse json_metadata', 'hive-utils', {
      error: err instanceof Error ? err.message : String(err),
      metadata: typeof json === 'string' ? json.slice(0, 200) : 'non-string',
    });
    return {};
  }
}

/**
 * Check if a raw Hive post originated from the Sportsblock app.
 * Inspects json_metadata and category — NOT a TypeScript type guard.
 */
export function isFromSportsblockApp(post: { json_metadata?: string; category?: string }): boolean {
  const metadata = parseJsonMetadata(post.json_metadata || '');

  // Check for Sportsblock app tag
  if (metadata.app === 'sportsblock/1.0.0' || metadata.app === 'sportsblock') {
    return true;
  }

  // Check for Sportsblock community tag
  if (post.category === 'hive-115814' || metadata.community === 'hive-115814') {
    return true;
  }

  // Check for Sportsblock tags
  if (metadata.tags && Array.isArray(metadata.tags) && metadata.tags.includes('sportsblock')) {
    return true;
  }

  return false;
}

/**
 * Get sport category from post metadata
 * @param post - Hive post object
 * @returns Sport category ID or null
 */
export function getSportCategory(post: { json_metadata?: string }): string | null {
  const metadata = parseJsonMetadata(post.json_metadata || '');
  return (metadata.sport_category as string) || null;
}

/**
 * Calculate Resource Credits percentage
 * @param rc - Resource Credits object
 * @returns RC percentage (0-100)
 */
export function calculateRCPercentage(rc: {
  rc_manabar?: { current_mana: string };
  max_rc?: string;
}): number {
  if (!rc || !rc.rc_manabar || !rc.max_rc) return 0;

  const current = parseFloat(rc.rc_manabar.current_mana);
  const max = parseFloat(rc.max_rc);

  if (max === 0) return 0;

  return Math.min(100, (current / max) * 100);
}

/**
 * Format Resource Credits for display
 * @param rc - Resource Credits object
 * @returns Formatted RC string
 */
export function formatResourceCredits(rc: {
  rc_manabar?: { current_mana: string };
  max_rc?: string;
}): string {
  if (!rc || !rc.rc_manabar || !rc.max_rc) return '0%';

  const percentage = calculateRCPercentage(rc);
  return `${percentage.toFixed(1)}%`;
}

/**
 * Check if user has enough Resource Credits for posting
 * @param rc - Resource Credits object
 * @param threshold - Minimum RC percentage needed (default: 10%)
 * @returns True if user has enough RC
 */
export function hasEnoughRC(
  rc: { rc_manabar?: { current_mana: string }; max_rc?: string },
  threshold: number = 10
): boolean {
  return calculateRCPercentage(rc) >= threshold;
}

/**
 * Convert HIVE POWER to liquid HIVE
 * @param vestingShares - Vesting shares string
 * @param totalVestingShares - Total vesting shares in the system
 * @param totalVestingFund - Total vesting fund HIVE
 * @returns Liquid HIVE amount
 */
export function vestingSharesToHive(
  vestingShares: string,
  totalVestingShares: string,
  totalVestingFund: string
): number {
  const shares = parseFloat(vestingShares);
  const totalShares = parseFloat(totalVestingShares);
  const totalFund = parseFloat(totalVestingFund);

  if (totalShares === 0) return 0;

  return (shares / totalShares) * totalFund;
}

/**
 * Generate Hive blog URL
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Full Hive blog URL
 */
export function generateHiveUrl(author: string, permlink: string): string {
  return `https://hive.blog/@${author}/${permlink}`;
}

/**
 * Generate HiveSigner URL for voting
 * @param author - Post author
 * @param permlink - Post permlink
 * @param voter - Voter username
 * @param weight - Vote weight (0-100)
 * @returns HiveSigner voting URL
 */
export function generateHiveSignerVoteUrl(
  author: string,
  permlink: string,
  voter: string,
  weight: number
): string {
  const params = new URLSearchParams({
    author,
    permlink,
    voter,
    weight: weight.toString(),
  });

  return `https://hivesigner.com/sign/vote?${params.toString()}`;
}

/**
 * Generate HiveSigner URL for posting
 * @param author - Post author
 * @param title - Post title
 * @param body - Post body
 * @param jsonMetadata - Post metadata JSON
 * @param permlink - Post permlink
 * @returns HiveSigner posting URL
 */
export function generateHiveSignerPostUrl(
  author: string,
  title: string,
  body: string,
  jsonMetadata: string,
  permlink: string
): string {
  const params = new URLSearchParams({
    author,
    title,
    body,
    json_metadata: jsonMetadata,
    permlink,
  });

  return `https://hivesigner.com/sign/comment?${params.toString()}`;
}

/**
 * Validate Hive username
 * @param username - Username to validate
 * @returns True if username is valid
 */
export function isValidHiveUsername(username: string): boolean {
  // Hive usernames must be 3-16 characters, alphanumeric and dots only
  const regex = /^[a-z0-9.]{3,16}$/;
  return regex.test(username) && !username.startsWith('.') && !username.endsWith('.');
}

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param length - Maximum length
 * @returns Truncated text with ellipsis
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length - 3) + '...';
}

// Error handling utilities
export class HiveError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'HiveError';
  }
}

export function handleHiveError(error: Error | unknown): HiveError {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage?.includes('Insufficient Resource Credits')) {
    return new HiveError(
      'Insufficient Resource Credits. You need more HIVE POWER or delegation to perform this action.',
      'INSUFFICIENT_RC',
      error
    );
  }

  if (errorMessage?.includes('missing required posting authority')) {
    return new HiveError(
      'Missing posting authority. Please ensure you have the correct posting key.',
      'MISSING_AUTHORITY',
      error
    );
  }

  if (errorMessage?.includes('Duplicate')) {
    return new HiveError(
      'This post already exists. Please change the title or wait a moment.',
      'DUPLICATE_POST',
      error
    );
  }

  if (errorMessage?.includes('Account does not exist')) {
    return new HiveError(
      'Account does not exist on the Hive blockchain.',
      'ACCOUNT_NOT_FOUND',
      error
    );
  }

  return new HiveError(errorMessage || 'An unknown error occurred', 'UNKNOWN_ERROR', error);
}
