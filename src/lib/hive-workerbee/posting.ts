import { initializeWorkerBeeClient, SPORTS_ARENA_CONFIG } from './client';

// Helper function to make direct HTTP calls to Hive API
// WorkerBee is designed for event-driven automation, not direct API calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function makeHiveApiCall(api: string, method: string, params: any[] = []): Promise<any> {
  const response = await fetch('https://api.hive.blog', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: `${api}.${method}`,
      params: params,
      id: Math.floor(Math.random() * 1000000)
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(`API error: ${result.error.message}`);
  }
  
  return result.result;
}
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

function parseJsonMetadata(jsonMetadata: string): any {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Publish a post to the Hive blockchain using WorkerBee
 * @param postData - Post data to publish
 * @param postingKey - User's posting private key
 * @returns Publish result
 */
export async function publishPost(postData: PostData, postingKey: string): Promise<PublishResult> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();
    
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

    // Create the post operation using Wax
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

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();
    
    // Broadcast the transaction using WorkerBee
    const result = await client.chain.broadcast.sendOperations([operation as any], postingKey);
    
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
    console.error('Error publishing post with WorkerBee:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Publish a comment/reply to an existing post using WorkerBee
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
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();
    
    // Generate permlink for comment (timestamp-based)
    const timestamp = Date.now();
    const permlink = `re-${commentData.parentAuthor}-${commentData.parentPermlink}-${timestamp}`;
    
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

    // Create the comment operation using Wax
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

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();
    
    // Broadcast the transaction using WorkerBee
    const result = await client.chain.broadcast.sendOperations([operation as any], postingKey);
    
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
    console.error('Error publishing comment with WorkerBee:', error);
    
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
  postingKey: string
): Promise<PublishResult> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();
    
    // Get existing post to preserve some data
    const existingPost = await makeHiveApiCall('condenser_api', 'get_content', [updateData.author, updateData.permlink]);
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

    // Create the update operation using Wax
    const operation = {
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
    };

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();
    
    // Broadcast the transaction using WorkerBee
    const result = await client.chain.broadcast.sendOperations([operation as any], postingKey);

    return {
      success: true,
      transactionId: result.id,
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
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const rc = await makeHiveApiCall('rc_api', 'get_resource_credits', [username]);
    
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
