import {
  MUTED_AUTHORS,
  createPostOperation,
  createCommentOperation,
  createCommentOptionsOperation,
  type Beneficiary,
} from './shared';
import { workerBee as workerBeeLog, error as logError } from './logger';

import type { BroadcastFn, HiveOperation } from '@/lib/hive/broadcast-client';

// Sub-community data for publishing to a specific community
export interface SubCommunityData {
  id: string;
  slug: string;
  name: string;
}

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
  subCommunity?: SubCommunityData;
  beneficiaries?: Beneficiary[];
  rewardsOption?: '50_50' | 'power_up' | 'decline';
  aiGenerated?: { coverImage?: boolean };
}

export interface PublishResult {
  success: boolean;
  transactionId?: string;
  confirmed?: boolean;
  author?: string;
  permlink?: string;
  url?: string;
  error?: string;
  /** True if delete_comment succeeded; false if fell back to soft delete */
  hardDeleted?: boolean;
}

/**
 * Publish a post to the Hive blockchain using Wax
 * @param postData - Post data to publish
 * @returns Publish result
 */
export async function publishPost(
  postData: PostData,
  broadcastFn: BroadcastFn
): Promise<PublishResult> {
  try {
    workerBeeLog('publishPost start', undefined, postData);

    if (MUTED_AUTHORS.includes(postData.author)) {
      return { success: false, error: 'This account has been muted and cannot post.' };
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
      jsonMetadata: postData.jsonMetadata,
      subCommunity: postData.subCommunity,
      aiGenerated: postData.aiGenerated,
    });

    workerBeeLog('publishPost operation created', undefined, operation);

    // Create comment_options operation for beneficiaries and rewards settings
    const commentOptionsOp = createCommentOptionsOperation({
      author: postData.author,
      permlink: operation.permlink,
      beneficiaries: postData.beneficiaries,
      maxAcceptedPayout: postData.rewardsOption === 'decline' ? '0.000 HBD' : undefined,
      percentHbd: postData.rewardsOption === 'power_up' ? 0 : undefined,
    });

    workerBeeLog('publishPost comment_options created', undefined, commentOptionsOp);

    const operations: HiveOperation[] = [
      ['comment', operation],
      ['comment_options', commentOptionsOp],
    ];

    workerBeeLog('publishPost operations prepared with beneficiaries', undefined, operations);

    workerBeeLog('publishPost broadcasting transaction');
    const result = await broadcastFn(operations, 'posting');

    workerBeeLog('publishPost broadcast result', undefined, result);

    if (!result.success) {
      logError('publishPost: transaction failed', undefined, undefined, result);
      throw new Error(`Transaction failed: ${result.error || 'Unknown error'}`);
    }

    // Generate post URL
    const url = `https://hive.blog/@${postData.author}/${operation.permlink}`;

    const transactionId = result.transactionId || 'unknown';

    return {
      success: true,
      transactionId,
      author: postData.author,
      permlink: operation.permlink,
      url,
    };
  } catch (error) {
    logError(
      'Error publishing post with Wax',
      undefined,
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Publish a comment/reply to an existing post using Wax
 * @param commentData - Comment data
 * @param broadcastFn - Broadcast function (optional, will use default if not provided)
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
  broadcastFn: BroadcastFn
): Promise<PublishResult> {
  try {
    workerBeeLog('publishComment start', undefined, commentData);

    if (MUTED_AUTHORS.includes(commentData.author)) {
      return { success: false, error: 'This account has been muted and cannot comment.' };
    }

    // Create comment operation using Wax helpers
    const operation = createCommentOperation({
      author: commentData.author,
      body: commentData.body,
      parentAuthor: commentData.parentAuthor,
      parentPermlink: commentData.parentPermlink,
      jsonMetadata: commentData.jsonMetadata,
    });

    workerBeeLog('publishComment operation created', undefined, operation);

    const operations: HiveOperation[] = [['comment', operation]];

    workerBeeLog('publishComment operations prepared', undefined, operations);

    workerBeeLog('publishComment broadcasting transaction');
    const result = await broadcastFn(operations, 'posting');

    workerBeeLog('publishComment broadcast result', undefined, result);

    if (!result.success) {
      logError('publishComment: transaction failed', undefined, undefined, result);
      throw new Error(`Transaction failed: ${result.error || 'Unknown error'}`);
    }

    // Generate comment URL
    const url = `https://hive.blog/@${commentData.author}/${operation.permlink}`;

    const transactionId = result.transactionId || 'unknown';

    return {
      success: true,
      transactionId,
      author: commentData.author,
      permlink: operation.permlink,
      url,
    };
  } catch (error) {
    logError(
      'Error publishing comment with Wax',
      undefined,
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
