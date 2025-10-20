import { getWaxClient, initializeWorkerBeeClient } from './client';

// Helper function to make direct HTTP calls to Hive API
async function makeHiveApiCall<T = unknown>(api: string, method: string, params: unknown[] = []): Promise<T> {
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
    console.error('API Error Details:', result.error);
    throw new Error(`API error: ${result.error.message || JSON.stringify(result.error)}`);
  }
  
  return result.result;
}

interface HiveVote {
  voter: string;
  weight: number;
  rshares: string;
  percent: number;
  reputation: string;
  time: string;
}

// Types matching the original comments.ts interface
export interface CommentData {
  author: string;
  body: string;
  parentAuthor: string;
  parentPermlink: string;
  jsonMetadata?: string;
}

export interface CommentResult {
  success: boolean;
  transactionId?: string;
  author?: string;
  permlink?: string;
  url?: string;
  error?: string;
}

export interface CommentTree {
  comment: HiveComment;
  replies: CommentTree[];
  depth: number;
}

export interface HiveComment {
  id: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  created: string;
  last_update: string;
  depth: number;
  children: number;
  net_votes: number;
  active_votes: HiveVote[];
  pending_payout_value: string;
  total_pending_payout_value: string;
  curator_payout_value: string;
  author_payout_value: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  json_metadata: string;
  parent_author: string;
  parent_permlink: string;
  author_reputation: string;
}

// Utility functions
function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

function calculateReputation(reputation: string | number): number {
  if (typeof reputation === 'string') {
    reputation = parseInt(reputation);
  }
  if (reputation === 0) return 25;
  const neg = reputation < 0;
  if (neg) reputation = -reputation;
  let rep = Math.log10(reputation);
  rep = Math.max(rep - 9, 0);
  if (rep < 0) rep = 0;
  rep = rep * 9 + 25;
  return neg ? -rep : rep;
}

function getUserVote(post: { active_votes?: HiveVote[] }, voter: string): HiveComment | null {
  if (!post.active_votes) return null;
  const vote = post.active_votes.find((vote) => vote.voter === voter);
  return vote as unknown as HiveComment || null;
}

/**
 * Post a comment/reply to a post or another comment using WorkerBee
 * @param commentData - Comment data
 * @param postingKey - User's posting private key
 * @returns Comment result
 */
export async function postComment(commentData: CommentData, postingKey: string): Promise<CommentResult> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();
    
    // Generate unique permlink for the comment
    const timestamp = Date.now();
    const permlink = `re-${commentData.parentAuthor}-${commentData.parentPermlink}-${timestamp}`;
    
    // Build JSON metadata
    const metadata = {
      app: 'sportsblock/1.0.0',
      format: 'markdown',
      tags: ['sportsblock'],
      ...(commentData.jsonMetadata ? parseJsonMetadata(commentData.jsonMetadata) : {})
    };

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
      percent_hbd: 10000, // 100% HBD
      allow_votes: true,
      allow_curation_rewards: true,
    };

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();
    
    // Broadcast the transaction using WorkerBee
    await client.broadcast(operation as any);
    
    // Generate comment URL
    const url = `https://hive.blog/@${commentData.author}/${permlink}`;

    return {
      success: true,
      transactionId: 'broadcasted',
      author: commentData.author,
      permlink,
      url,
    };
  } catch (error) {
    console.error('Error posting comment with WorkerBee:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update an existing comment using WorkerBee
 * @param updateData - Update data
 * @param postingKey - User's posting private key
 * @returns Update result
 */
export async function updateComment(
  updateData: {
    author: string;
    permlink: string;
    body: string;
    jsonMetadata?: string;
  },
  _postingKey: string
): Promise<CommentResult> {
  try {
    // Get Wax client
    const wax = await getWaxClient();
    
    // Get existing comment to preserve some data
    const existingComment = await makeHiveApiCall('condenser_api', 'get_content', [updateData.author, updateData.permlink]) as any;
    if (!existingComment) {
      throw new Error('Comment not found');
    }

    // Check if comment can still be updated (within 7 days)
    const commentAge = Date.now() - new Date(existingComment.created as string).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (commentAge > sevenDays) {
      throw new Error('Comment cannot be updated after 7 days');
    }

    // Merge metadata
    const existingMetadata = parseJsonMetadata(existingComment.json_metadata as string);
    const updateMetadata = updateData.jsonMetadata ? parseJsonMetadata(updateData.jsonMetadata) : {};
    const mergedMetadata = { ...existingMetadata, ...updateMetadata };

    // Create the update operation using Wax
    const operation = {
      parent_author: existingComment.parent_author as string,
      parent_permlink: existingComment.parent_permlink as string,
      author: updateData.author,
      permlink: updateData.permlink,
      title: '', // Comments don't have titles
      body: updateData.body,
      json_metadata: JSON.stringify(mergedMetadata),
      max_accepted_payout: existingComment.max_accepted_payout as string,
      percent_hbd: existingComment.percent_hbd as number,
      allow_votes: existingComment.allow_votes as boolean,
      allow_curation_rewards: existingComment.allow_curation_rewards as boolean,
    };

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();
    
    // Broadcast the transaction using WorkerBee
    await client.broadcast(operation as any);

    return {
      success: true,
      transactionId: 'broadcasted',
      author: updateData.author,
      permlink: updateData.permlink,
      url: `https://hive.blog/@${updateData.author}/${updateData.permlink}`,
    };
  } catch (error) {
    console.error('Error updating comment with WorkerBee:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a comment (set body to empty) using WorkerBee
 * @param deleteData - Delete data
 * @param postingKey - User's posting private key
 * @returns Delete result
 */
export async function deleteComment(
  deleteData: {
    author: string;
    permlink: string;
  },
  _postingKey: string
): Promise<CommentResult> {
  try {
    // "Deleting" a comment on Hive means setting the body to empty
    return await updateComment({
      author: deleteData.author,
      permlink: deleteData.permlink,
      body: '',
      jsonMetadata: JSON.stringify({
        app: 'sportsblock/1.0.0',
        tags: ['deleted', 'sportsblock']
      })
    }, _postingKey);
  } catch (error) {
    console.error('Error deleting comment with WorkerBee:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetch comments for a post using WorkerBee/Wax
 * @param author - Post author
 * @param permlink - Post permlink
 * @param limit - Number of comments to fetch
 * @returns Array of comments
 */
export async function fetchComments(author: string, permlink: string, limit: number = 100): Promise<HiveComment[]> {
  try {
    // Get Wax client
    const wax = await getWaxClient();

    const comments = await makeHiveApiCall('condenser_api', 'get_content_replies', [author, permlink]);
    
    return (comments || []) as unknown as HiveComment[];
  } catch (error) {
    console.error('Error fetching comments with WorkerBee:', error);
    throw error;
  }
}

/**
 * Fetch a single comment by author and permlink using WorkerBee/Wax
 * @param author - Comment author
 * @param permlink - Comment permlink
 * @returns Comment data
 */
export async function fetchComment(author: string, permlink: string): Promise<HiveComment | null> {
  try {
    // Get Wax client
    const wax = await getWaxClient();

    const comment = await makeHiveApiCall('condenser_api', 'get_content', [author, permlink]);
    
    return (comment || null) as unknown as HiveComment | null;
  } catch (error) {
    console.error('Error fetching comment with WorkerBee:', error);
    return null;
  }
}

/**
 * Build comment tree structure from flat comment list
 * @param comments - Flat array of comments
 * @param rootAuthor - Root post author
 * @param rootPermlink - Root post permlink
 * @returns Comment tree structure
 */
export function buildCommentTree(comments: HiveComment[], rootAuthor: string, rootPermlink: string): CommentTree[] {
  // Create a map for quick lookup
  const commentMap = new Map<string, HiveComment>();
  comments.forEach(comment => {
    const key = `${comment.author}/${comment.permlink}`;
    commentMap.set(key, comment);
  });

  // Build tree recursively
  function buildTree(parentAuthor: string, parentPermlink: string, depth: number = 0): CommentTree[] {
    const children = comments.filter(comment => 
      comment.parent_author === parentAuthor && comment.parent_permlink === parentPermlink
    );

    return children.map(comment => ({
      comment,
      replies: buildTree(comment.author, comment.permlink, depth + 1),
      depth,
    }));
  }

  return buildTree(rootAuthor, rootPermlink);
}

/**
 * Get comment statistics using WorkerBee
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Comment statistics
 */
export async function getCommentStats(author: string, permlink: string): Promise<{
  totalComments: number;
  totalReplies: number;
  uniqueAuthors: number;
  pendingPayout: number;
}> {
  try {
    const comments = await fetchComments(author, permlink, 1000);
    
    const uniqueAuthors = new Set(comments.map(c => c.author)).size;
    const totalReplies = comments.filter(c => c.depth > 0).length;
    const pendingPayout = comments.reduce((sum, c) => {
      return sum + parseFloat(c.pending_payout_value || '0');
    }, 0);

    return {
      totalComments: comments.length,
      totalReplies,
      uniqueAuthors,
      pendingPayout,
    };
  } catch (error) {
    console.error('Error getting comment stats with WorkerBee:', error);
    return {
      totalComments: 0,
      totalReplies: 0,
      uniqueAuthors: 0,
      pendingPayout: 0,
    };
  }
}

/**
 * Get user's recent comments using WorkerBee
 * @param username - Username
 * @param limit - Number of comments to fetch
 * @returns Recent comments
 */
export async function getUserComments(username: string, limit: number = 20): Promise<HiveComment[]> {
  try {
    console.log(`[getUserComments] Fetching comments for user: ${username} (requested limit: ${limit})`);
    
    // Get Wax client
    const wax = await getWaxClient();

    // Use get_discussions_by_comments to get recent comments
    // This method is specifically designed for comments and doesn't require date parameters
    // Ensure limit is within valid range (1-20) for get_discussions_by_comments
    const validLimit = Math.min(Math.max(limit, 1), 20);
    console.log(`[getUserComments] Using valid limit: ${validLimit} (max allowed: 20)`);
    
    const params = [
      {
        start_author: username,
        start_permlink: '',
        limit: validLimit,
        truncate_body: 0
      }
    ];
    
    console.log(`[getUserComments] API call parameters:`, params);
    
    const comments = await makeHiveApiCall('condenser_api', 'get_discussions_by_comments', params) as any[];

    console.log(`[getUserComments] Found ${comments?.length || 0} comments for user ${username}`);

    if (!comments || comments.length === 0) {
      console.log(`[getUserComments] No comments found for user ${username}`);
      return [];
    }

    // Filter to only comments by the specific user (in case there are replies to their comments)
    const userComments = (comments || []).filter((comment: Record<string, unknown>) => {
      const author = comment.author as string;
      return author === username;
    }) as unknown as HiveComment[];

    console.log(`[getUserComments] Found ${userComments.length} comments by user ${username}`);
    return userComments;
  } catch (error) {
    console.error('Error fetching user comments with WorkerBee:', error);
    console.error('Error details:', error);
    return [];
  }
}

/**
 * Check if user has commented on a post using WorkerBee
 * @param author - Post author
 * @param permlink - Post permlink
 * @param username - Username to check
 * @returns True if user has commented
 */
export async function hasUserCommented(author: string, permlink: string, username: string): Promise<boolean> {
  try {
    const comments = await fetchComments(author, permlink, 100);
    return comments.some(comment => comment.author === username);
  } catch (error) {
    console.error('Error checking user comments with WorkerBee:', error);
    return false;
  }
}

/**
 * Get comment with user's vote information using WorkerBee
 * @param comment - Comment object
 * @param username - Username to check vote for
 * @returns Comment with vote info
 */
export function enrichCommentWithVote(comment: HiveComment, username: string): HiveComment & {
  userVote?: HiveComment | null;
  reputation: number;
} {
  const userVote = getUserVote(comment, username);
  const reputation = calculateReputation(comment.author_reputation);

  return {
    ...comment,
    userVote,
    reputation,
  };
}

/**
 * Sort comments by different criteria
 * @param comments - Comments to sort
 * @param sortBy - Sort criteria
 * @returns Sorted comments
 */
export function sortComments(comments: HiveComment[], sortBy: 'newest' | 'oldest' | 'votes' | 'payout' = 'newest'): HiveComment[] {
  switch (sortBy) {
    case 'oldest':
      return [...comments].sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
    
    case 'votes':
      return [...comments].sort((a, b) => b.net_votes - a.net_votes);
    
    case 'payout':
      return [...comments].sort((a, b) => {
        const payoutA = parseFloat(a.pending_payout_value || '0');
        const payoutB = parseFloat(b.pending_payout_value || '0');
        return payoutB - payoutA;
      });
    
    case 'newest':
    default:
      return [...comments].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }
}

/**
 * Filter comments by criteria
 * @param comments - Comments to filter
 * @param filters - Filter criteria
 * @returns Filtered comments
 */
export function filterComments(comments: HiveComment[], filters: {
  minDepth?: number;
  maxDepth?: number;
  authors?: string[];
  minVotes?: number;
  excludeDeleted?: boolean;
}): HiveComment[] {
  return comments.filter(comment => {
    if (filters.minDepth !== undefined && comment.depth < filters.minDepth) return false;
    if (filters.maxDepth !== undefined && comment.depth > filters.maxDepth) return false;
    if (filters.authors && !filters.authors.includes(comment.author)) return false;
    if (filters.minVotes !== undefined && comment.net_votes < filters.minVotes) return false;
    if (filters.excludeDeleted && comment.body.trim() === '') return false;
    
    return true;
  });
}

/**
 * Get comment thread (all replies to a specific comment) using WorkerBee
 * @param author - Comment author
 * @param permlink - Comment permlink
 * @returns Comment thread
 */
export async function getCommentThread(author: string, permlink: string): Promise<HiveComment[]> {
  try {
    const comments = await fetchComments(author, permlink, 100);
    
    // Filter to get all replies to this specific comment
    return comments.filter(comment => 
      comment.parent_author === author && comment.parent_permlink === permlink
    );
  } catch (error) {
    console.error('Error fetching comment thread with WorkerBee:', error);
    return [];
  }
}
