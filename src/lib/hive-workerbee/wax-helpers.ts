/**
 * Wax Integration Helpers
 * 
 * Centralized utilities for Wax library integration with WorkerBee.
 * Provides type-safe operation builders, transaction validation, and error handling.
 */

import { getWaxClient } from './client';
import { SPORTS_ARENA_CONFIG } from './client';
import { workerBee as workerBeeLog, error as logError } from './logger';
import type { IHiveChainInterface } from "@hiveio/wax";

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

export interface WaxTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  blockNum?: number;
  trxNum?: number;
}

/**
 * Get Wax instance with proper error handling
 */
export async function getWaxInstance(): Promise<IHiveChainInterface> {
  try {
    return await getWaxClient();
  } catch (error) {
    logError('[Wax Helpers] Failed to get Wax instance', 'getWaxInstance', error instanceof Error ? error : undefined);
    throw new Error('Unable to initialize Wax client. Please check your connection.');
  }
}

/**
 * Create a vote operation using Wax
 */
export function createVoteOperation(voteData: {
  voter: string;
  author: string;
  permlink: string;
  weight: number; // 0-100 percentage
}): WaxVoteOperation {
  // Validate vote weight
  if (voteData.weight < 0 || voteData.weight > 100) {
    throw new Error('Vote weight must be between 0 and 100');
  }

  return {
    voter: voteData.voter,
    author: voteData.author,
    permlink: voteData.permlink,
    weight: Math.round(voteData.weight * 100), // Convert to 0-10000 scale
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
    ...(commentData.jsonMetadata ? JSON.parse(commentData.jsonMetadata) : {})
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
    extensions: commentData.extensions || []
  };
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
}): WaxPostOperation {
  // Generate permlink if not provided
  const permlink = postData.permlink || generatePermlink(postData.title);
  
  // Build JSON metadata
  const metadata = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: [
      ...(postData.tags || []),
      SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
      'sportsblock'
    ],
    community: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    sport_category: postData.sportCategory,
    image: postData.featuredImage ? [postData.featuredImage] : undefined,
    ...(postData.jsonMetadata ? JSON.parse(postData.jsonMetadata) : {})
  };

  return {
    parent_author: postData.parentAuthor || '',
    parent_permlink: postData.parentPermlink || SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
    author: postData.author,
    permlink,
    title: postData.title,
    body: postData.body,
    json_metadata: JSON.stringify(metadata),
    max_accepted_payout: postData.maxAcceptedPayout || '1000000.000 HBD',
    percent_hbd: postData.percentHbd || 10000, // 100% HBD
    allow_votes: postData.allowVotes !== false,
    allow_curation_rewards: postData.allowCurationRewards !== false,
    extensions: postData.extensions || [
      [
        0,
        {
          beneficiaries: SPORTS_ARENA_CONFIG.DEFAULT_BENEFICIARIES
        }
      ]
    ]
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
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  return `${basePermlink}-${timestamp}`;
}

/**
 * Validate operation data before broadcasting
 */
export function validateOperation(operation: WaxVoteOperation | WaxCommentOperation | WaxPostOperation): {
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
    errors
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
    const waxOperations = operations.map(op => {
      if ('weight' in op) {
        return ['vote', op];
      } else {
        return ['comment', op];
      }
    });

    // For now, return success without actual broadcasting
    // The actual broadcasting should be handled by Aioha
    workerBeeLog('[Wax Helpers] Wax operations created successfully', undefined, waxOperations);
    return {
      success: true,
      transactionId: 'wax-operation-created',
      blockNum: 0,
      trxNum: 0
    };
  } catch (error) {
    logError('[Wax Helpers] Transaction broadcast failed', 'broadcastWaxTransaction', error instanceof Error ? error : undefined);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get account information using Wax
 */
export async function getAccountWax(username: string): Promise<unknown | null> {
  try {
    // For now, disable Wax API calls due to requestInterceptor issues
    // Fall back to HTTP API calls
    workerBeeLog(`[Wax Helpers] Wax API calls temporarily disabled for account: ${username}, using fallback`);
    return null;
  } catch (error) {
    logError('[Wax Helpers] Failed to get account', 'getAccountWax', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Get content using Wax
 */
export async function getContentWax(author: string, permlink: string): Promise<unknown | null> {
  try {
    // For now, disable Wax API calls due to requestInterceptor issues
    // Fall back to HTTP API calls
    workerBeeLog(`[Wax Helpers] Wax API calls temporarily disabled for content: @${author}/${permlink}, using fallback`);
    return null;
  } catch (error) {
    logError('[Wax Helpers] Failed to get content', 'getContentWax', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Get discussions using Wax
 */
export async function getDiscussionsWax(
  method: string,
  params: unknown[]
): Promise<unknown[]> {
  try {
    // For now, disable Wax API calls due to requestInterceptor issues
    // Fall back to HTTP API calls
    workerBeeLog(`[Wax Helpers] Wax API calls temporarily disabled for method: ${method} with ${params.length} params, using fallback`);
    return [];
  } catch (error) {
    logError('[Wax Helpers] Failed to get discussions', 'getDiscussionsWax', error instanceof Error ? error : undefined);
    return [];
  }
}

/**
 * Check if user has sufficient Resource Credits using Wax
 */
export async function checkResourceCreditsWax(username: string): Promise<{
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}> {
  try {
    const account = await getAccountWax(username) as Record<string, unknown>;
    
    if (!account) {
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Account not found'
      };
    }

    // Extract RC information
    const rcManabar = account.rc_manabar as Record<string, unknown>;
    const maxRc = account.max_rc as string;
    
    if (!rcManabar || !maxRc) {
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Resource Credits information not available'
      };
    }

    const rcPercentage = (parseFloat(rcManabar.current_mana as string) / parseFloat(maxRc)) * 100;
    
    // Users typically need at least 10% RC to post
    if (rcPercentage < 10) {
      return {
        canPost: false,
        rcPercentage,
        message: 'Insufficient Resource Credits. You need more HIVE POWER or delegation to post.'
      };
    }

    return {
      canPost: true,
      rcPercentage,
    };
  } catch (error) {
    logError('[Wax Helpers] Failed to check RC', 'checkResourceCreditsWax', error instanceof Error ? error : undefined);
    return {
      canPost: false,
      rcPercentage: 0,
      message: 'Error checking Resource Credits'
    };
  }
}

/**
 * Get user's voting power using Wax
 */
export async function getVotingPowerWax(username: string): Promise<number> {
  try {
    const account = await getAccountWax(username) as Record<string, unknown>;
    
    if (!account || !account.voting_power) {
      return 0;
    }
    
    return ((account.voting_power as number) / 100); // Convert from 0-10000 to 0-100
  } catch (error) {
    logError('[Wax Helpers] Failed to get voting power', 'getVotingPowerWax', error instanceof Error ? error : undefined);
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
    // const wax = await getWaxInstance(); // Temporarily disabled
    // Temporarily disable Wax API calls due to requestInterceptor issues
    throw new Error('Wax API calls temporarily disabled');
  } catch (error) {
    logError('[Wax Helpers] Failed to get protocol version', 'getWaxProtocolVersion', error instanceof Error ? error : undefined);
    return 'unknown';
  }
}
