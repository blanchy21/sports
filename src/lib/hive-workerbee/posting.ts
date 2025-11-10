import { SPORTS_ARENA_CONFIG, initializeWorkerBeeClient } from './client';
import { makeHiveApiCall } from './api';
import { HiveAccount } from '../shared/types';
import type { ITransaction } from "@hiveio/wax";
import { 
  createPostOperation, 
  createCommentOperation, 
  checkResourceCreditsWax
} from './wax-helpers';
import { workerBee as workerBeeLog, warn as logWarn, error as logError } from './logger';

// Type definitions for better type safety
interface HiveAccountWithRC extends HiveAccount {
  rc_manabar?: {
    current_mana: string;
    last_update_time: number;
  };
  max_rc?: string;
}
interface AiohaInstance {
  signAndBroadcastTx?: (ops: unknown[], keyType: string) => Promise<unknown>;
}

interface BroadcastResult {
  error?: string;
  id?: string;
  [key: string]: unknown;
}



// Removed unused interface

import { aioha } from '@/lib/aioha/config';
// import { Wax } from '@hiveio/wax'; // Not needed for basic posting operations

// Types matching the original posting.ts interface
export interface PostData {
  title: string;
  body: string;
  sportCategory?: string;
  tags: string[];
  featuredImage?: string;
  author: string;
  parentAuthor?: string;
  parentPermlink?: string;
  jsonMetadata?: string;
}

export interface PublishResult {
  success: boolean;
  transactionId?: string;
  author?: string;
  permlink?: string;
  url?: string;
  error?: string;
}

// Removed unused function - now using Wax helpers

function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Publish a post to the Hive blockchain using Wax
 * @param postData - Post data to publish
 * @returns Publish result
 */
export async function publishPost(postData: PostData): Promise<PublishResult> {
  try {
    workerBeeLog('publishPost start', undefined, postData);
    
    if (!aioha) {
      logError('publishPost: Aioha instance unavailable', undefined, undefined, aioha);
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    // Validate post data
    const validation = validatePostData(postData);
    if (!validation.isValid) {
      throw new Error(`Post validation failed: ${validation.errors.join(', ')}`);
    }

    // Create post operation using Wax helpers
    const operation = createPostOperation({
      author: postData.author,
      title: postData.title,
      body: postData.body,
      parentAuthor: postData.parentAuthor,
      parentPermlink: postData.parentPermlink,
      sportCategory: postData.sportCategory,
      featuredImage: postData.featuredImage,
      tags: postData.tags,
      jsonMetadata: postData.jsonMetadata
    });

    workerBeeLog('publishPost operation created', undefined, operation);

    // Use Aioha to sign and broadcast the transaction
    // Aioha expects operations in a specific format - each operation should be an array
    // Format: [operation_type, operation_data]
    const operations = [
      ['comment', operation]
    ];
    
    workerBeeLog('publishPost operations prepared', undefined, operations);
    
    // Check if signAndBroadcastTx method exists
    if (typeof (aioha as AiohaInstance)?.signAndBroadcastTx !== 'function') {
      logError('publishPost: signAndBroadcastTx missing on Aioha instance');
      throw new Error("Aioha signAndBroadcastTx method is not available. Please check your authentication.");
    }

    // Use Aioha to sign and broadcast the transaction
    workerBeeLog('publishPost broadcasting transaction');
    const result = await (aioha as AiohaInstance).signAndBroadcastTx!(operations, 'posting');
    
    workerBeeLog('publishPost broadcast result', undefined, result);
    
    // Check if the result indicates success
    if (!result || (result as BroadcastResult)?.error) {
      logError('publishPost: transaction failed', undefined, undefined, result);
      throw new Error(`Transaction failed: ${(result as BroadcastResult)?.error || 'Unknown error'}`);
    }
    
    // Generate post URL
    const url = `https://hive.blog/@${postData.author}/${operation.permlink}`;

    return {
      success: true,
      transactionId: (result as { id?: string })?.id || 'unknown',
      author: postData.author,
      permlink: operation.permlink,
      url,
    };
  } catch (error) {
    logError('Error publishing post with Wax', undefined, error instanceof Error ? error : undefined);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Publish a comment/reply to an existing post using Wax
 * @param commentData - Comment data
 * @param aiohaInstance - Aioha instance (optional, will use default if not provided)
 * @returns Publish result
 */
export async function publishComment(
  commentData: {
    body: string;
    author: string;
    parentAuthor: string;
    parentPermlink: string;
    jsonMetadata?: string;
  },
  aiohaInstance?: unknown
): Promise<PublishResult> {
  try {
    workerBeeLog('publishComment start', undefined, commentData);
    
    // Use provided instance or fall back to default
    const aiohaToUse = aiohaInstance || (await import('@/lib/aioha/config')).aioha;
    
    if (!aiohaToUse) {
      logError('publishComment: Aioha instance unavailable', undefined, undefined, aiohaToUse);
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    // Create comment operation using Wax helpers
    const operation = createCommentOperation({
      author: commentData.author,
      body: commentData.body,
      parentAuthor: commentData.parentAuthor,
      parentPermlink: commentData.parentPermlink,
      jsonMetadata: commentData.jsonMetadata
    });

    workerBeeLog('publishComment operation created', undefined, operation);

    // Use Aioha to sign and broadcast the transaction
    // Aioha expects operations in a specific format - each operation should be an array
    // Format: [operation_type, operation_data]
    const operations = [
      ['comment', operation]
    ];
    
    workerBeeLog('publishComment operations prepared', undefined, operations);
    
    // Check if signAndBroadcastTx method exists
    if (typeof (aiohaToUse as AiohaInstance)?.signAndBroadcastTx !== 'function') {
      logError('publishComment: signAndBroadcastTx missing on Aioha instance');
      throw new Error("Aioha signAndBroadcastTx method is not available. Please check your authentication.");
    }

    // Use Aioha to sign and broadcast the transaction
    workerBeeLog('publishComment broadcasting transaction');
    const result = await (aiohaToUse as AiohaInstance).signAndBroadcastTx!(operations, 'posting');
    
    workerBeeLog('publishComment broadcast result', undefined, result);
    
    // Check if the result indicates success
    if (!result || (result as BroadcastResult)?.error) {
      logError('publishComment: transaction failed', undefined, undefined, result);
      throw new Error(`Transaction failed: ${(result as BroadcastResult)?.error || 'Unknown error'}`);
    }
    
    // Generate comment URL
    const url = `https://hive.blog/@${commentData.author}/${operation.permlink}`;

    return {
      success: true,
      transactionId: (result as { id?: string })?.id || 'unknown',
      author: commentData.author,
      permlink: operation.permlink,
      url,
    };
  } catch (error) {
    logError('Error publishing comment with Wax', undefined, error instanceof Error ? error : undefined);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update an existing post using WorkerBee
 * @param updateData - Update data
 * @returns Update result
 */
export async function updatePost(
  updateData: {
    author: string;
    permlink: string;
    title?: string;
    body?: string;
    jsonMetadata?: string;
  }): Promise<PublishResult> {
  try {
    
    // Get existing post to preserve some data
    const existingPost = await makeHiveApiCall('condenser_api', 'get_content', [updateData.author, updateData.permlink]);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    // Check if post can still be updated (within 7 days)
    const postAge = Date.now() - new Date((existingPost as { created: string }).created).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (postAge > sevenDays) {
      throw new Error('Post cannot be updated after 7 days');
    }

    // Merge metadata
    const existingMetadata = parseJsonMetadata((existingPost as { json_metadata: string }).json_metadata);
    const updateMetadata = updateData.jsonMetadata ? parseJsonMetadata(updateData.jsonMetadata) : {};
    const mergedMetadata = { ...existingMetadata, ...updateMetadata };

    // Create the update operation using Wax
    const operation = {
      parent_author: (existingPost as { parent_author: string }).parent_author,
      parent_permlink: (existingPost as { parent_permlink: string }).parent_permlink,
      author: updateData.author,
      permlink: updateData.permlink,
      title: updateData.title || (existingPost as { title: string }).title,
      body: updateData.body || (existingPost as { body: string }).body,
      json_metadata: JSON.stringify(mergedMetadata),
      max_accepted_payout: (existingPost as { max_accepted_payout: string }).max_accepted_payout,
      percent_hbd: (existingPost as { percent_hbd: number }).percent_hbd,
      allow_votes: (existingPost as { allow_votes: boolean }).allow_votes,
      allow_curation_rewards: (existingPost as { allow_curation_rewards: boolean }).allow_curation_rewards,
      extensions: (existingPost as { extensions: unknown[] }).extensions,
    };

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();
    
    // Broadcast the transaction using WorkerBee
    await client.broadcast(operation as unknown as ITransaction);

    return {
      success: true,
      transactionId: 'broadcasted',
      author: updateData.author,
      permlink: updateData.permlink,
      url: `https://hive.blog/@${updateData.author}/${updateData.permlink}`,
    };
  } catch (error) {
    logError('Error updating post with WorkerBee', undefined, error instanceof Error ? error : undefined);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a post (only possible within 7 days, sets body to empty) using WorkerBee
 * @param deleteData - Delete data
 * @returns Delete result
 */
export async function deletePost(
  deleteData: {
    author: string;
    permlink: string;
  }
): Promise<PublishResult> {
  try {
    // "Deleting" a post on Hive means setting the body to empty
    return await updatePost({
      author: deleteData.author,
      permlink: deleteData.permlink,
      body: '',
      jsonMetadata: JSON.stringify({
        app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
        tags: ['deleted', 'sportsblock']
      })
    });
  } catch (error) {
    logError('Error deleting post with WorkerBee', undefined, error instanceof Error ? error : undefined);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if user has enough Resource Credits to post using Wax
 * @param username - Username to check
 * @returns True if user can post
 */
export async function canUserPost(username: string): Promise<{
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}> {
  try {
    workerBeeLog(`canUserPost check RC for ${username} via Wax`);
    
    // Use Wax helpers for RC checking
    const rcCheck = await checkResourceCreditsWax(username);
    
    if (!rcCheck.canPost) {
      logWarn(`canUserPost insufficient RC for ${username}: ${rcCheck.message}`);
      return rcCheck;
    }

    workerBeeLog(`canUserPost sufficient RC for ${username}`, undefined, { rcPercentage: rcCheck.rcPercentage });
    return rcCheck;
  } catch (error) {
    logError('Error checking RC with Wax', undefined, error instanceof Error ? error : undefined);
    
    // Fallback to original method if Wax fails
    try {
      logWarn('canUserPost falling back to original RC check method');
      const accountResult = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]) as HiveAccountWithRC[];
      const account = accountResult && accountResult.length > 0 ? accountResult[0] : null;
      
      if (!account) {
        return {
          canPost: false,
          rcPercentage: 0,
          message: 'Unable to fetch account information'
        };
      }

      const rc_manabar = account.rc_manabar as { current_mana: string } | undefined;
      const max_rc = account.max_rc as string | undefined;
      
      if (!rc_manabar || !max_rc) {
        return {
          canPost: false,
          rcPercentage: 0,
          message: 'Resource Credits information not available'
        };
      }

      const rcPercentage = (parseFloat(rc_manabar.current_mana) / parseFloat(max_rc)) * 100;
      
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
    } catch (fallbackError) {
      logError('Error in fallback RC check:', fallbackError instanceof Error ? fallbackError : undefined);
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Error checking Resource Credits'
      };
    }
  }
}

/**
 * Get estimated Resource Credit cost for posting
 * @param bodyLength - Length of post body
 * @returns Estimated RC cost
 */
export function getEstimatedRCCost(bodyLength: number): number {
  // Rough estimation: ~1 RC per character for posts
  // This is approximate and actual costs may vary
  return Math.max(1000, bodyLength * 1.2);
}

/**
 * Validate post data before publishing
 * @param postData - Post data to validate
 * @returns Validation result
 */
export function validatePostData(postData: PostData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!postData.title || postData.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!postData.body || postData.body.trim().length === 0) {
    errors.push('Body is required');
  }

  if (postData.title && postData.title.length > 255) {
    errors.push('Title is too long (max 255 characters)');
  }

  if (postData.body && postData.body.length > 65535) {
    errors.push('Body is too long (max 65535 characters)');
  }

  if (!postData.author || postData.author.trim().length === 0) {
    errors.push('Author is required');
  }

  if (postData.tags && postData.tags.length > 5) {
    errors.push('Too many tags (max 5)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
