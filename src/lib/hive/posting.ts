import { getHiveClient, SPORTS_ARENA_CONFIG } from './client';
import { HivePost, HivePostMetadata } from './types';
import { 
  generatePermlink, 
  generateUniquePermlink, 
  parseJsonMetadata,
  handleHiveError 
} from './utils';

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

/**
 * Publish a post to the Hive blockchain
 * @param postData - Post data to publish
 * @param postingKey - User's posting private key
 * @returns Publish result
 */
export async function publishPost(postData: PostData, postingKey: string): Promise<PublishResult> {
  try {
    const client = getHiveClient();
    
    // Generate unique permlink
    const permlink = generateUniquePermlink(postData.title);
    
    // Build JSON metadata
    const metadata: HivePostMetadata = {
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
    const operation = [
      'comment',
      {
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
      }
    ] as any;

    // Broadcast the transaction
    const result = await client.broadcast.sendOperations([operation], postingKey as any);
    
    // Generate post URL
    const url = `https://hive.blog/@${postData.author}/${permlink}`;

    return {
      success: true,
      transactionId: result.id,
      author: postData.author,
      permlink,
      url,
    };
  } catch (error) {
    console.error('Error publishing post:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Publish a comment/reply to an existing post
 * @param commentData - Comment data
 * @param postingKey - User's posting private key
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
  postingKey: string
): Promise<PublishResult> {
  try {
    const client = getHiveClient();
    
    // Generate permlink for comment (timestamp-based)
    const timestamp = Date.now();
    const permlink = `re-${commentData.parentAuthor}-${commentData.parentPermlink}-${timestamp}`;
    
    // Build JSON metadata for comment
    const metadata: HivePostMetadata = {
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
    const operation = [
      'comment',
      {
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
      }
    ] as any;

    // Broadcast the transaction
    const result = await client.broadcast.sendOperations([operation], postingKey as any);
    
    // Generate comment URL
    const url = `https://hive.blog/@${commentData.author}/${permlink}`;

    return {
      success: true,
      transactionId: result.id,
      author: commentData.author,
      permlink,
      url,
    };
  } catch (error) {
    console.error('Error publishing comment:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Update an existing post (only possible within 7 days)
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
  postingKey: string
): Promise<PublishResult> {
  try {
    const client = getHiveClient();
    
    // Get existing post to preserve some data
    const existingPost = await client.database.call('get_content', [updateData.author, updateData.permlink]);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    // Check if post can still be updated (within 7 days)
    const postAge = Date.now() - new Date(existingPost.created).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (postAge > sevenDays) {
      throw new Error('Post cannot be updated after 7 days');
    }

    // Merge metadata
    const existingMetadata = parseJsonMetadata(existingPost.json_metadata);
    const updateMetadata = updateData.jsonMetadata ? parseJsonMetadata(updateData.jsonMetadata) : {};
    const mergedMetadata = { ...existingMetadata, ...updateMetadata };

    // Create the update operation
    const operation = [
      'comment',
      {
        parent_author: existingPost.parent_author,
        parent_permlink: existingPost.parent_permlink,
        author: updateData.author,
        permlink: updateData.permlink,
        title: updateData.title || existingPost.title,
        body: updateData.body || existingPost.body,
        json_metadata: JSON.stringify(mergedMetadata),
        max_accepted_payout: existingPost.max_accepted_payout,
        percent_hbd: existingPost.percent_hbd,
        allow_votes: existingPost.allow_votes,
        allow_curation_rewards: existingPost.allow_curation_rewards,
        extensions: existingPost.extensions,
      }
    ] as any;

    // Broadcast the transaction
    const result = await client.broadcast.sendOperations([operation], postingKey as any);

    return {
      success: true,
      transactionId: result.id,
      author: updateData.author,
      permlink: updateData.permlink,
      url: `https://hive.blog/@${updateData.author}/${updateData.permlink}`,
    };
  } catch (error) {
    console.error('Error updating post:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Delete a post (only possible within 7 days, sets body to empty)
 * @param deleteData - Delete data
 * @param postingKey - User's posting private key
 * @returns Delete result
 */
export async function deletePost(
  deleteData: {
    author: string;
    permlink: string;
  },
  postingKey: string
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
    }, postingKey);
  } catch (error) {
    console.error('Error deleting post:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Check if user has enough Resource Credits to post
 * @param username - Username to check
 * @returns True if user can post
 */
export async function canUserPost(username: string): Promise<{
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}> {
  try {
    const client = getHiveClient();
    const rc = await client.rc.call('get_resource_credits', [username]);
    
    if (!rc) {
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Unable to fetch Resource Credits'
      };
    }

    const rcPercentage = (parseFloat(rc.rc_manabar.current_mana) / parseFloat(rc.max_rc)) * 100;
    
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
    console.error('Error checking RC:', error);
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
