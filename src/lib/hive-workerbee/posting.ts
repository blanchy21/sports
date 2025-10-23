import { SPORTS_ARENA_CONFIG, initializeWorkerBeeClient } from './client';
import { makeHiveApiCall } from './api';
import { HiveAccount } from '../shared/types';

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

interface RcResult {
  rc_accounts?: Array<{
    rc_manabar?: { current_mana: string };
    max_rc?: string;
  }>;
}

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

// Utility functions
function generateUniquePermlink(title: string): string {
  // Convert title to permlink format
  const permlink = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  return `${permlink}-${timestamp}`;
}

function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Publish a post to the Hive blockchain using Aioha
 * @param postData - Post data to publish
 * @returns Publish result
 */
export async function publishPost(postData: PostData): Promise<PublishResult> {
  try {
    console.log('[publishPost] Starting post publication:', postData);
    
    if (!aioha) {
      console.error('[publishPost] Aioha is not available:', aioha);
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    console.log('[publishPost] Aioha instance:', aioha);
    console.log('[publishPost] Aioha methods:', Object.keys(aioha as object));

    // Generate unique permlink
    const permlink = generateUniquePermlink(postData.title);
    
    // Build JSON metadata
    const metadata = {
      app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
      format: 'markdown',
      tags: [
        ...postData.tags,
        SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
        'sportsblock'
      ],
      community: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
      sport_category: postData.sportCategory,
      image: postData.featuredImage ? [postData.featuredImage] : undefined,
    };

    // Add any additional metadata
    if (postData.jsonMetadata) {
      const additionalMetadata = parseJsonMetadata(postData.jsonMetadata);
      Object.assign(metadata, additionalMetadata);
    }

    // Create the post operation
    const operation = {
      parent_author: postData.parentAuthor || '',
      parent_permlink: postData.parentPermlink || SPORTS_ARENA_CONFIG.COMMUNITY_NAME,
      author: postData.author,
      permlink,
      title: postData.title,
      body: postData.body,
      json_metadata: JSON.stringify(metadata),
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10000, // 100% HBD
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [
        [
          0,
          {
            beneficiaries: SPORTS_ARENA_CONFIG.DEFAULT_BENEFICIARIES
          }
        ]
      ]
    };

    // Use Aioha to sign and broadcast the transaction
    // Aioha expects operations in a specific format - each operation should be an array
    // Format: [operation_type, operation_data]
    const operations = [
      ['post', operation]
    ];
    
    console.log('[publishPost] Operations array:', operations);
    
    // Check if signAndBroadcastTx method exists
    if (typeof (aioha as AiohaInstance)?.signAndBroadcastTx !== 'function') {
      console.error('[publishPost] signAndBroadcastTx method not available on Aioha instance');
      throw new Error("Aioha signAndBroadcastTx method is not available. Please check your authentication.");
    }

    // Use Aioha to sign and broadcast the transaction
    console.log('[publishPost] Attempting to sign and broadcast transaction...');
    const result = await (aioha as AiohaInstance).signAndBroadcastTx!(operations, 'posting');
    
    console.log('[publishPost] Broadcast result:', result);
    
    // Check if the result indicates success
    if (!result || (result as BroadcastResult)?.error) {
      console.error('[publishPost] Transaction failed:', result);
      throw new Error(`Transaction failed: ${(result as BroadcastResult)?.error || 'Unknown error'}`);
    }
    
    // Generate post URL
    const url = `https://hive.blog/@${postData.author}/${permlink}`;

    return {
      success: true,
      transactionId: (result as { id?: string })?.id || 'unknown',
      author: postData.author,
      permlink,
      url,
    };
  } catch (error) {
    console.error('Error publishing post with Aioha:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Publish a comment/reply to an existing post using Aioha
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
    console.log('[publishComment] Starting comment publication:', commentData);
    
    // Use provided instance or fall back to default
    const aiohaToUse = aiohaInstance || (await import('@/lib/aioha/config')).aioha;
    
    if (!aiohaToUse) {
      console.error('[publishComment] Aioha is not available:', aiohaToUse);
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    console.log('[publishComment] Aioha instance:', aiohaToUse);
    console.log('[publishComment] Aioha methods:', Object.keys(aiohaToUse as object));

    // Generate permlink for comment (timestamp-based)
    const timestamp = Date.now();
    const permlink = `re-${commentData.parentAuthor}-${commentData.parentPermlink}-${timestamp}`;
    
    console.log('[publishComment] Generated permlink:', permlink);
    
    // Build JSON metadata for comment
    const metadata = {
      app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
      format: 'markdown',
      tags: ['sportsblock'],
    };

    // Add any additional metadata
    if (commentData.jsonMetadata) {
      const additionalMetadata = parseJsonMetadata(commentData.jsonMetadata);
      Object.assign(metadata, additionalMetadata);
    }

    // Create the comment operation
    const operation = {
      parent_author: commentData.parentAuthor,
      parent_permlink: commentData.parentPermlink,
      author: commentData.author,
      permlink,
      title: '', // Comments don't have titles
      body: commentData.body,
      json_metadata: JSON.stringify(metadata),
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
    };

    console.log('[publishComment] Operation to broadcast:', operation);

    // Check if signAndBroadcastTx method exists
    if (typeof (aiohaToUse as AiohaInstance)?.signAndBroadcastTx !== 'function') {
      console.error('[publishComment] signAndBroadcastTx method not available on Aioha instance');
      throw new Error("Aioha signAndBroadcastTx method is not available. Please check your authentication.");
    }

    // Use Aioha to sign and broadcast the transaction
    console.log('[publishComment] Attempting to sign and broadcast transaction...');
    
    // Aioha expects operations in a specific format - each operation should be an array
    // Format: [operation_type, operation_data]
    const operations = [
      ['comment', {
        parent_author: commentData.parentAuthor,
        parent_permlink: commentData.parentPermlink,
        author: commentData.author,
        permlink,
        title: '', // Comments don't have titles
        body: commentData.body,
        json_metadata: JSON.stringify(metadata),
        max_accepted_payout: '1000000.000 HBD',
        percent_hbd: 10000,
        allow_votes: true,
        allow_curation_rewards: true,
      }]
    ];
    
    console.log('[publishComment] Operations array:', operations);
    
    const result = await (aiohaToUse as AiohaInstance).signAndBroadcastTx!(operations, 'posting');
    
    console.log('[publishComment] Broadcast result:', result);
    
    // Check if the result indicates success
    if (!result || (result as BroadcastResult)?.error) {
      console.error('[publishComment] Transaction failed:', result);
      throw new Error(`Transaction failed: ${(result as BroadcastResult)?.error || 'Unknown error'}`);
    }
    
    // Generate comment URL
    const url = `https://hive.blog/@${commentData.author}/${permlink}`;

    return {
      success: true,
      transactionId: (result as { id?: string })?.id || 'unknown',
      author: commentData.author,
      permlink,
      url,
    };
  } catch (error) {
    console.error('Error publishing comment with Aioha:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update an existing post using WorkerBee
 * @param updateData - Update data
 * @param postingKey - User's posting private key
 * @returns Update result
 */
export async function updatePost(
  updateData: {
    author: string;
    permlink: string;
    title?: string;
    body?: string;
    jsonMetadata?: string;
  },
  _postingKey: string): Promise<PublishResult> {
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
    await client.broadcast(operation as unknown as any);

    return {
      success: true,
      transactionId: 'broadcasted',
      author: updateData.author,
      permlink: updateData.permlink,
      url: `https://hive.blog/@${updateData.author}/${updateData.permlink}`,
    };
  } catch (error) {
    console.error('Error updating post with WorkerBee:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a post (only possible within 7 days, sets body to empty) using WorkerBee
 * @param deleteData - Delete data
 * @param postingKey - User's posting private key
 * @returns Delete result
 */
export async function deletePost(
  deleteData: {
    author: string;
    permlink: string;
  },
  _postingKey: string
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
    }, _postingKey);
  } catch (error) {
    console.error('Error deleting post with WorkerBee:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if user has enough Resource Credits to post using WorkerBee
 * @param username - Username to check
 * @returns True if user can post
 */
export async function canUserPost(username: string): Promise<{
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}> {
  try {

    // Use condenser_api.get_accounts to get account info including RC
    const accountResult = await makeHiveApiCall('condenser_api', 'get_accounts', [[username]]) as HiveAccountWithRC[];
    const account = accountResult && accountResult.length > 0 ? accountResult[0] : null;
    
    if (!account) {
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Unable to fetch account information'
      };
    }

    // Extract RC information from account data
    const rc_manabar = account.rc_manabar as { current_mana: string } | undefined;
    const max_rc = account.max_rc as string | undefined;
    
    if (!rc_manabar || !max_rc) {
      // Debug: Log all available fields in account data
      console.log(`[canUserPost] Available account fields:`, Object.keys(account));
      console.log(`[canUserPost] RC-related fields:`, {
        rc_manabar: account.rc_manabar,
        max_rc: account.max_rc,
        rc_manabar_type: typeof account.rc_manabar,
        max_rc_type: typeof account.max_rc
      });
      
      // Try to get RC data using condenser_api.get_account (singular)
      try {
        console.log(`[canUserPost] Trying condenser_api.get_account for RC data...`);
        const accountWithRc = await makeHiveApiCall('condenser_api', 'get_account', [username]) as HiveAccountWithRC;
        console.log(`[canUserPost] get_account response fields:`, Object.keys(accountWithRc));
        
        if (accountWithRc && accountWithRc.rc_manabar && accountWithRc.max_rc) {
          const rcManabar = accountWithRc.rc_manabar as { current_mana: string };
          const maxRc = accountWithRc.max_rc as string;
          const rcPercentage = (parseFloat(rcManabar.current_mana) / parseFloat(maxRc)) * 100;
          console.log(`[canUserPost] RC from get_account: ${rcPercentage.toFixed(2)}%`);
          
          if (rcPercentage < 10) {
            return {
              canPost: false,
              rcPercentage,
              message: `Insufficient Resource Credits: ${rcPercentage.toFixed(1)}% (need at least 10%)`
            };
          }

          return {
            canPost: true,
            rcPercentage,
          };
        }
      } catch (getAccountError) {
        console.warn('Failed to fetch RC from get_account:', getAccountError);
      }
      
      // Try rc_api with different parameter format
      try {
        console.log(`[canUserPost] Trying rc_api.find_rc_accounts with different format...`);
        const rcResult = await makeHiveApiCall('rc_api', 'find_rc_accounts', [username]);
        console.log(`[canUserPost] rc_api response:`, rcResult);
        
        if (rcResult && (rcResult as RcResult).rc_accounts && Array.isArray((rcResult as RcResult).rc_accounts) && (rcResult as RcResult).rc_accounts!.length > 0) {
          const rcData = (rcResult as RcResult).rc_accounts![0];
          if (rcData && rcData.rc_manabar && rcData.max_rc) {
            const rcPercentage = (parseFloat(rcData.rc_manabar.current_mana) / parseFloat(rcData.max_rc)) * 100;
            console.log(`[canUserPost] RC from rc_api: ${rcPercentage.toFixed(2)}%`);
            
            if (rcPercentage < 10) {
              return {
                canPost: false,
                rcPercentage,
                message: `Insufficient Resource Credits: ${rcPercentage.toFixed(1)}% (need at least 10%)`
              };
            }

            return {
              canPost: true,
              rcPercentage,
            };
          }
        }
      } catch (rcApiError) {
        console.warn('Failed to fetch RC from rc_api:', rcApiError);
      }
      
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Resource Credits information not available'
      };
    }

    const rcPercentage = (parseFloat(rc_manabar.current_mana) / parseFloat(max_rc)) * 100;
    
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
    console.error('Error checking RC with WorkerBee:', error);
    return {
      canPost: false,
      rcPercentage: 0,
      message: 'Error checking Resource Credits'
    };
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
