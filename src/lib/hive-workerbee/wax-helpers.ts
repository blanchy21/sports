/**
 * Wax Integration Helpers
 *
 * Centralized utilities for Wax library integration with WorkerBee.
 * Provides type-safe operation builders, transaction validation, and error handling.
 */

import { getWaxClient } from './client';
import { SPORTS_ARENA_CONFIG } from './client';
import { workerBee as workerBeeLog, error as logError } from './logger';
import type { IHiveChainInterface } from '@hiveio/wax';

/**
 * Extended Wax client interface with optional methods.
 * These methods may be available at runtime but aren't in the type definitions.
 */
interface WaxExtended extends IHiveChainInterface {
  call?: (method: string, params: unknown[]) => Promise<unknown>;
  getProtocolVersion?: () => Promise<string>;
}

/**
 * Type guard to check if Wax client has the RPC call method.
 */
function hasRpcCall(
  wax: IHiveChainInterface | null
): wax is WaxExtended & { call: NonNullable<WaxExtended['call']> } {
  return wax !== null && typeof (wax as WaxExtended).call === 'function';
}

/**
 * Type guard to check if Wax client has the getProtocolVersion method.
 */
function hasProtocolVersion(
  wax: IHiveChainInterface | null
): wax is WaxExtended & { getProtocolVersion: NonNullable<WaxExtended['getProtocolVersion']> } {
  return wax !== null && typeof (wax as WaxExtended).getProtocolVersion === 'function';
}

// Wax operation types for better type safety
export interface WaxVoteOperation {
  voter: string;
  author: string;
  permlink: string;
  weight: number;
}

export interface WaxCommentOperation {
  parent_author: string;
  parent_permlink: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  extensions?: unknown[];
}

// Posts are essentially comments with specific parent settings
// Using type alias instead of interface to avoid empty interface warning
export type WaxPostOperation = WaxCommentOperation;

export interface WaxCommentOptionsOperation {
  author: string;
  permlink: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  extensions: Array<[0, { beneficiaries: Array<{ account: string; weight: number }> }]>;
}

export interface Beneficiary {
  account: string;
  weight: number; // 0-10000 (basis points, so 2000 = 20%)
}

/**
 * Validate beneficiary configuration
 * @param beneficiaries - Array of beneficiaries to validate
 * @returns Validation result with errors if invalid
 */
export function validateBeneficiaries(beneficiaries: Beneficiary[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (beneficiaries.length > 8) {
    errors.push('Maximum 8 beneficiaries allowed');
  }

  let totalWeight = 0;
  const seenAccounts = new Set<string>();

  for (const beneficiary of beneficiaries) {
    // Validate account name (3-16 chars, lowercase alphanumeric and dots/hyphens)
    if (!beneficiary.account || !/^[a-z][a-z0-9.-]{2,15}$/.test(beneficiary.account)) {
      errors.push(`Invalid account name: ${beneficiary.account || '(empty)'}`);
    }

    // Check for duplicate accounts
    if (seenAccounts.has(beneficiary.account)) {
      errors.push(`Duplicate beneficiary account: ${beneficiary.account}`);
    }
    seenAccounts.add(beneficiary.account);

    // Validate individual weight (must be positive integer, max 10000)
    if (
      !Number.isInteger(beneficiary.weight) ||
      beneficiary.weight < 1 ||
      beneficiary.weight > 10000
    ) {
      errors.push(
        `Invalid weight for ${beneficiary.account}: ${beneficiary.weight} (must be 1-10000)`
      );
    }

    totalWeight += beneficiary.weight;
  }

  // Total weight cannot exceed 10000 (100%)
  if (totalWeight > 10000) {
    errors.push(
      `Total beneficiary weight ${totalWeight} exceeds maximum 10000 (${(totalWeight / 100).toFixed(2)}% > 100%)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface WaxTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  blockNum?: number;
  trxNum?: number;
}

// Power Up/Down operation types
export interface WaxTransferToVestingOperation {
  from: string;
  to: string;
  amount: string; // e.g., "10.000 HIVE"
}

export interface WaxWithdrawVestingOperation {
  account: string;
  vesting_shares: string; // e.g., "10000.000000 VESTS"
}

/**
 * Format HIVE amount with proper precision (3 decimals)
 */
export function formatHiveAmount(amount: number): string {
  return `${amount.toFixed(3)} HIVE`;
}

/**
 * Format VESTS amount with proper precision (6 decimals)
 */
export function formatVestsAmount(amount: number): string {
  return `${amount.toFixed(6)} VESTS`;
}

/**
 * Create a Power Up (transfer_to_vesting) operation
 * Converts liquid HIVE to HIVE Power (vesting shares)
 *
 * @param from - Account sending HIVE
 * @param to - Account receiving HIVE Power (usually same as from)
 * @param amount - Amount of HIVE to power up (number, will be formatted)
 */
export function createPowerUpOperation(powerUpData: {
  from: string;
  to?: string; // Defaults to 'from' if not specified
  amount: number; // HIVE amount
}): WaxTransferToVestingOperation {
  if (powerUpData.amount <= 0) {
    throw new Error('Power up amount must be greater than 0');
  }

  if (powerUpData.amount < 0.001) {
    throw new Error('Minimum power up amount is 0.001 HIVE');
  }

  return {
    from: powerUpData.from,
    to: powerUpData.to || powerUpData.from,
    amount: formatHiveAmount(powerUpData.amount),
  };
}

/**
 * Create a Power Down (withdraw_vesting) operation
 * Starts the 13-week power down process to convert HIVE Power to liquid HIVE
 *
 * @param account - Account powering down
 * @param vestingShares - Amount of VESTS to power down (number, will be formatted)
 */
export function createPowerDownOperation(powerDownData: {
  account: string;
  vestingShares: number; // VESTS amount
}): WaxWithdrawVestingOperation {
  if (powerDownData.vestingShares < 0) {
    throw new Error('Power down amount cannot be negative');
  }

  return {
    account: powerDownData.account,
    vesting_shares: formatVestsAmount(powerDownData.vestingShares),
  };
}

/**
 * Create a Cancel Power Down operation
 * Cancels an active power down by setting vesting_shares to 0
 *
 * @param account - Account to cancel power down for
 */
export function createCancelPowerDownOperation(account: string): WaxWithdrawVestingOperation {
  return {
    account,
    vesting_shares: '0.000000 VESTS',
  };
}

/**
 * Get Wax instance with proper error handling
 * Attempts to initialize WorkerBee and access the Wax chain interface
 */
export async function getWaxInstance(): Promise<IHiveChainInterface> {
  try {
    const wax = await getWaxClient();

    // Verify the Wax instance is valid
    if (!wax) {
      throw new Error('Wax instance is null or undefined');
    }

    return wax;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's a requestInterceptor-related error
    if (errorMessage.includes('requestInterceptor')) {
      logError(
        '[Wax Helpers] requestInterceptor issue detected - Wax may not be fully compatible in this environment',
        'getWaxInstance',
        error instanceof Error ? error : undefined
      );
      throw new Error(
        'Wax requestInterceptor issue: Wax API may not be compatible in this browser environment. Falling back to HTTP API.'
      );
    }

    logError(
      '[Wax Helpers] Failed to get Wax instance',
      'getWaxInstance',
      error instanceof Error ? error : undefined
    );
    throw new Error(`Unable to initialize Wax client: ${errorMessage}`);
  }
}

/**
 * Create a vote operation using Wax
 */
export function createVoteOperation(voteData: {
  voter: string;
  author: string;
  permlink: string;
  weight: number; // -100 to 100 percentage (negative = downvote)
}): WaxVoteOperation {
  // Validate vote weight: -100 to 100 (negative for downvotes)
  if (voteData.weight < -100 || voteData.weight > 100) {
    throw new Error('Vote weight must be between -100 and 100');
  }

  return {
    voter: voteData.voter,
    author: voteData.author,
    permlink: voteData.permlink,
    weight: Math.round(voteData.weight * 100), // Convert to -10000 to 10000 scale
  };
}

/**
 * Create a comment operation using Wax
 */
export function createCommentOperation(commentData: {
  author: string;
  body: string;
  parentAuthor: string;
  parentPermlink: string;
  permlink?: string;
  title?: string;
  jsonMetadata?: string;
  maxAcceptedPayout?: string;
  percentHbd?: number;
  allowVotes?: boolean;
  allowCurationRewards?: boolean;
  extensions?: unknown[];
}): WaxCommentOperation {
  // Generate permlink if not provided
  const permlink = commentData.permlink || generatePermlink(commentData.title || 'comment');

  // Build JSON metadata
  const metadata = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: ['sportsblock'],
    ...(commentData.jsonMetadata ? JSON.parse(commentData.jsonMetadata) : {}),
  };

  return {
    parent_author: commentData.parentAuthor,
    parent_permlink: commentData.parentPermlink,
    author: commentData.author,
    permlink,
    title: commentData.title || '',
    body: commentData.body,
    json_metadata: JSON.stringify(metadata),
    max_accepted_payout: commentData.maxAcceptedPayout || '1000000.000 HBD',
    percent_hbd: commentData.percentHbd || 10000, // 100% HBD
    allow_votes: commentData.allowVotes !== false,
    allow_curation_rewards: commentData.allowCurationRewards !== false,
    extensions: commentData.extensions || [],
  };
}

/**
 * Sub-community data for tagging posts to user-created communities
 */
interface SubCommunityData {
  id: string;
  slug: string;
  name: string;
}

/**
 * Create a post operation using Wax (posts are comments with specific parent settings)
 */
export function createPostOperation(postData: {
  author: string;
  title: string;
  body: string;
  parentAuthor?: string;
  parentPermlink?: string;
  permlink?: string;
  jsonMetadata?: string;
  sportCategory?: string;
  featuredImage?: string;
  tags?: string[];
  maxAcceptedPayout?: string;
  percentHbd?: number;
  allowVotes?: boolean;
  allowCurationRewards?: boolean;
  extensions?: unknown[];
  subCommunity?: SubCommunityData;
}): WaxPostOperation {
  // Generate permlink if not provided
  const permlink = postData.permlink || generatePermlink(postData.title);

  // Build tags array, including sub-community slug if provided
  const tags = [
    ...(postData.tags || []),
    SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    'sportsblock',
    // Add sub-community slug as a tag for discoverability
    ...(postData.subCommunity ? [postData.subCommunity.slug] : []),
  ];

  // Build JSON metadata
  const metadata: Record<string, unknown> = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags,
    community: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    sport_category: postData.sportCategory,
    image: postData.featuredImage ? [postData.featuredImage] : undefined,
    ...(postData.jsonMetadata ? JSON.parse(postData.jsonMetadata) : {}),
  };

  // Add sub-community data to metadata if provided
  if (postData.subCommunity) {
    metadata.sub_community = postData.subCommunity.slug;
    metadata.sub_community_id = postData.subCommunity.id;
    metadata.sub_community_name = postData.subCommunity.name;
  }

  return {
    parent_author: postData.parentAuthor || '',
    parent_permlink: postData.parentPermlink || SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    author: postData.author,
    permlink,
    title: postData.title,
    body: postData.body,
    json_metadata: JSON.stringify(metadata),
    max_accepted_payout: postData.maxAcceptedPayout || '1000000.000 HBD',
    percent_hbd: postData.percentHbd || 10000, // 100% HBD
    allow_votes: postData.allowVotes !== false,
    allow_curation_rewards: postData.allowCurationRewards !== false,
    extensions: [], // Beneficiaries are set via comment_options operation
  };
}

/**
 * Create a comment_options operation for beneficiaries
 * This must be broadcast in the same transaction as the comment operation
 */
export function createCommentOptionsOperation(optionsData: {
  author: string;
  permlink: string;
  beneficiaries?: Beneficiary[];
  maxAcceptedPayout?: string;
  percentHbd?: number;
  allowVotes?: boolean;
  allowCurationRewards?: boolean;
}): WaxCommentOptionsOperation {
  // Use default beneficiaries if not provided
  const beneficiaries = optionsData.beneficiaries || SPORTS_ARENA_CONFIG.DEFAULT_BENEFICIARIES;

  // Validate beneficiaries before using them
  const validation = validateBeneficiaries(beneficiaries);
  if (!validation.isValid) {
    throw new Error(`Invalid beneficiaries: ${validation.errors.join(', ')}`);
  }

  // Beneficiaries must be sorted by account name alphabetically
  const sortedBeneficiaries = [...beneficiaries].sort((a, b) => a.account.localeCompare(b.account));

  return {
    author: optionsData.author,
    permlink: optionsData.permlink,
    max_accepted_payout: optionsData.maxAcceptedPayout || '1000000.000 HBD',
    percent_hbd: optionsData.percentHbd || 10000, // 100% HBD
    allow_votes: optionsData.allowVotes !== false,
    allow_curation_rewards: optionsData.allowCurationRewards !== false,
    extensions: sortedBeneficiaries.length > 0 ? [[0, { beneficiaries: sortedBeneficiaries }]] : [],
  };
}

/**
 * Generate a unique permlink for posts/comments
 */
export function generatePermlink(title: string): string {
  // Convert title to permlink format
  const basePermlink = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Add timestamp + random suffix to ensure uniqueness even in same millisecond
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${basePermlink}-${timestamp}-${randomSuffix}`;
}

/**
 * Validate operation data before broadcasting
 */
export function validateOperation(
  operation: WaxVoteOperation | WaxCommentOperation | WaxPostOperation
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Common validations
  if (!operation.author || operation.author.trim().length === 0) {
    errors.push('Author is required');
  }

  if (!operation.permlink || operation.permlink.trim().length === 0) {
    errors.push('Permlink is required');
  }

  // Vote-specific validations
  if ('weight' in operation) {
    if (operation.weight < 0 || operation.weight > 10000) {
      errors.push('Vote weight must be between 0 and 10000');
    }
  }

  // Comment/Post-specific validations
  if ('body' in operation) {
    if (!operation.body || operation.body.trim().length === 0) {
      errors.push('Body is required');
    }

    if (operation.body.length > 65535) {
      errors.push('Body is too long (max 65535 characters)');
    }
  }

  if ('title' in operation && operation.title && operation.title.length > 255) {
    errors.push('Title is too long (max 255 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Broadcast transaction using Wax with proper error handling
 */
export async function broadcastWaxTransaction(
  operations: (WaxVoteOperation | WaxCommentOperation | WaxPostOperation)[]
): Promise<WaxTransactionResult> {
  try {
    // const wax = await getWaxInstance(); // Temporarily disabled

    // Validate all operations before broadcasting
    for (const operation of operations) {
      const validation = validateOperation(operation);
      if (!validation.isValid) {
        throw new Error(`Operation validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Format operations for Wax
    const waxOperations = operations.map((op) => {
      if ('weight' in op) {
        return ['vote', op];
      } else {
        return ['comment', op];
      }
    });

    // For now, return success without actual broadcasting
    // The actual broadcasting should be handled by the wallet
    workerBeeLog('[Wax Helpers] Wax operations created successfully', undefined, waxOperations);
    return {
      success: true,
      transactionId: 'wax-operation-created',
      blockNum: 0,
      trxNum: 0,
    };
  } catch (error) {
    logError(
      '[Wax Helpers] Transaction broadcast failed',
      'broadcastWaxTransaction',
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get account information using Wax
 * Uses makeWaxApiCall for consistent API access
 */
export async function getAccountWax(username: string): Promise<unknown | null> {
  try {
    // Use makeWaxApiCall which handles multiple access patterns and fallback
    const { makeWaxApiCall } = await import('./api');
    const result = await makeWaxApiCall<unknown[]>('get_accounts', [[username]]);

    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get account',
        'getAccountWax',
        error instanceof Error ? error : undefined
      );
    }

    return null;
  }
}

/**
 * Get content using Wax
 * Uses makeWaxApiCall for consistent API access
 */
export async function getContentWax(author: string, permlink: string): Promise<unknown | null> {
  try {
    // Use makeWaxApiCall which handles multiple access patterns and fallback
    const { makeWaxApiCall } = await import('./api');
    const result = await makeWaxApiCall<unknown>('get_content', [author, permlink]);

    return result || null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get content',
        'getContentWax',
        error instanceof Error ? error : undefined
      );
    }

    return null;
  }
}

/**
 * Get discussions using Wax
 * Uses makeWaxApiCall for consistent API access
 */
export async function getDiscussionsWax(method: string, params: unknown[]): Promise<unknown[]> {
  try {
    // Use makeWaxApiCall which handles multiple access patterns and fallback
    const { makeWaxApiCall } = await import('./api');
    const result = await makeWaxApiCall<unknown[]>(method, params);

    return Array.isArray(result) ? result : [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get discussions',
        'getDiscussionsWax',
        error instanceof Error ? error : undefined
      );
    }

    return [];
  }
}

/**
 * Check if user has sufficient Resource Credits using the RC API
 * RC data must be fetched from rc_api.find_rc_accounts, not get_accounts
 */
export async function checkResourceCreditsWax(username: string): Promise<{
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}> {
  try {
    // RC data must be fetched from rc_api, not condenser_api
    // Note: rc_api uses object params, not array params like condenser_api
    const { makeHiveApiCall } = await import('./api');
    const rcResult = (await makeHiveApiCall('rc_api', 'find_rc_accounts', {
      accounts: [username],
    })) as {
      rc_accounts?: Array<{
        account: string;
        rc_manabar: {
          current_mana: string;
          last_update_time: number;
        };
        max_rc: string;
      }>;
    };

    const rcAccounts = rcResult?.rc_accounts;
    if (!rcAccounts || rcAccounts.length === 0) {
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Account not found',
      };
    }

    const rcAccount = rcAccounts[0];
    const rcManabar = rcAccount.rc_manabar;
    const maxRc = rcAccount.max_rc;

    if (!rcManabar || !maxRc) {
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Resource Credits information not available',
      };
    }

    // Calculate current RC with mana regeneration
    const now = Math.floor(Date.now() / 1000);
    const lastUpdate = rcManabar.last_update_time;
    const currentMana = BigInt(rcManabar.current_mana);
    const maxMana = BigInt(maxRc);

    // RC regenerates fully in 5 days (432000 seconds)
    const REGENERATION_SECONDS = 432000;
    const elapsed = now - lastUpdate;

    // Calculate regenerated mana
    let regeneratedMana = currentMana;
    if (elapsed > 0 && maxMana > 0n) {
      const regenAmount = (maxMana * BigInt(elapsed)) / BigInt(REGENERATION_SECONDS);
      regeneratedMana = currentMana + regenAmount;
      if (regeneratedMana > maxMana) {
        regeneratedMana = maxMana;
      }
    }

    const rcPercentage = maxMana > 0n ? Number((regeneratedMana * 10000n) / maxMana) / 100 : 0;

    // Users typically need at least 10% RC to post
    if (rcPercentage < 10) {
      return {
        canPost: false,
        rcPercentage,
        message: 'Insufficient Resource Credits. You need more HIVE POWER or delegation to post.',
      };
    }

    return {
      canPost: true,
      rcPercentage,
    };
  } catch (error) {
    logError(
      '[Wax Helpers] Failed to check RC',
      'checkResourceCreditsWax',
      error instanceof Error ? error : undefined
    );
    return {
      canPost: false,
      rcPercentage: 0,
      message: 'Error checking Resource Credits',
    };
  }
}

/**
 * Get user's voting power using Wax
 */
export async function getVotingPowerWax(username: string): Promise<number> {
  try {
    const account = (await getAccountWax(username)) as Record<string, unknown>;

    if (!account || !account.voting_power) {
      return 0;
    }

    return (account.voting_power as number) / 100; // Convert from 0-10000 to 0-100
  } catch (error) {
    logError(
      '[Wax Helpers] Failed to get voting power',
      'getVotingPowerWax',
      error instanceof Error ? error : undefined
    );
    return 0;
  }
}

/**
 * Utility to parse JSON metadata safely
 */
export function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Utility to format JSON metadata
 */
export function formatJsonMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata);
}

/**
 * Get Wax protocol version
 */
export async function getWaxProtocolVersion(): Promise<string> {
  try {
    const wax = await getWaxInstance();

    // Try to get protocol version from Wax
    if (hasProtocolVersion(wax)) {
      return await wax.getProtocolVersion();
    }

    // Fallback: try using call method to get dynamic global properties
    if (hasRpcCall(wax)) {
      const result = await wax.call('condenser_api.get_dynamic_global_properties', []);
      if (result && typeof result === 'object' && 'head_block_number' in result) {
        return '1.0.0'; // Return a default version if we can connect
      }
    }

    return 'unknown';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get protocol version',
        'getWaxProtocolVersion',
        error instanceof Error ? error : undefined
      );
    }

    return 'unknown';
  }
}
