import { initializeWorkerBeeClient } from './client';
import { makeHiveApiCall } from './api';
import type { ITransaction } from '@hiveio/wax';
import { createCommentOperation, formatJsonMetadata } from './wax-helpers';
import { workerBee as workerBeeLog, error as logError } from './logger';
import type { HiveVote, HiveComment as BaseHiveComment } from '@/lib/shared/types';
import { toHiveComments, isHiveComment } from '@/lib/shared/types';

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

/**
 * Extended HiveComment type with additional fields specific to comment operations.
 * Extends the base HiveComment from shared/types.ts.
 */
export interface HiveComment extends BaseHiveComment {
  /** Additional field for author's share of payout (may not be present on all comments) */
  author_payout_value?: string;
}

export interface CommentTree {
  comment: HiveComment;
  replies: CommentTree[];
  depth: number;
}

// Utility functions
function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Type assertion for broadcasting operations.
 * createCommentOperation returns a custom operation type that is compatible with
 * ITransaction but TypeScript doesn't know this. This wrapper provides a
 * self-documenting cast for the broadcast call.
 */
function asBroadcastableTransaction(
  operation: ReturnType<typeof createCommentOperation>
): ITransaction {
  return operation as unknown as ITransaction;
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

function getUserVote(post: { active_votes?: HiveVote[] }, voter: string): HiveVote | null {
  if (!post.active_votes) return null;
  return post.active_votes.find((vote) => vote.voter === voter) ?? null;
}

/**
 * Post a comment/reply to a post or another comment using Wax
 * @param commentData - Comment data
 * @returns Comment result
 */
export async function postComment(commentData: CommentData): Promise<CommentResult> {
  try {
    workerBeeLog('[postComment] Starting comment publication with Wax', undefined, commentData);

    // Create comment operation using Wax helpers
    const operation = createCommentOperation({
      author: commentData.author,
      body: commentData.body,
      parentAuthor: commentData.parentAuthor,
      parentPermlink: commentData.parentPermlink,
      jsonMetadata: commentData.jsonMetadata,
    });

    workerBeeLog('[postComment] Wax comment operation created', undefined, operation);

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();

    // Broadcast the transaction using WorkerBee
    await client.broadcast(asBroadcastableTransaction(operation));

    // Generate comment URL
    const url = `https://hive.blog/@${commentData.author}/${operation.permlink}`;

    return {
      success: true,
      transactionId: 'broadcasted',
      author: commentData.author,
      permlink: operation.permlink,
      url,
    };
  } catch (error) {
    logError(
      'Error posting comment with Wax',
      'postComment',
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update an existing comment using Wax
 * @param updateData - Update data
 * @returns Update result
 */
export async function updateComment(updateData: {
  author: string;
  permlink: string;
  body: string;
  jsonMetadata?: string;
}): Promise<CommentResult> {
  try {
    workerBeeLog('[updateComment] Starting comment update with Wax', undefined, updateData);

    // Get existing comment to preserve some data
    const commentResponse = await makeHiveApiCall('condenser_api', 'get_content', [
      updateData.author,
      updateData.permlink,
    ]);
    if (!isHiveComment(commentResponse)) {
      throw new Error('Comment not found');
    }
    const existingComment = commentResponse as HiveComment;

    // Check if comment can still be updated (within 7 days)
    const commentAge = Date.now() - new Date(existingComment.created).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (commentAge > sevenDays) {
      throw new Error('Comment cannot be updated after 7 days');
    }

    // Merge metadata
    const existingMetadata = parseJsonMetadata(existingComment.json_metadata);
    const updateMetadata = updateData.jsonMetadata
      ? parseJsonMetadata(updateData.jsonMetadata)
      : {};
    const mergedMetadata = { ...existingMetadata, ...updateMetadata };

    // Create the update operation using Wax helpers
    const operation = createCommentOperation({
      author: updateData.author,
      body: updateData.body,
      parentAuthor: existingComment.parent_author,
      parentPermlink: existingComment.parent_permlink,
      permlink: updateData.permlink,
      jsonMetadata: formatJsonMetadata(mergedMetadata),
      maxAcceptedPayout: existingComment.max_accepted_payout,
      percentHbd: existingComment.percent_hbd,
      allowVotes: existingComment.allow_votes,
      allowCurationRewards: existingComment.allow_curation_rewards,
    });

    workerBeeLog('[updateComment] Wax update operation created', undefined, operation);

    // Initialize WorkerBee client for broadcasting
    const client = await initializeWorkerBeeClient();

    // Broadcast the transaction using WorkerBee
    await client.broadcast(asBroadcastableTransaction(operation));

    return {
      success: true,
      transactionId: 'broadcasted',
      author: updateData.author,
      permlink: updateData.permlink,
      url: `https://hive.blog/@${updateData.author}/${updateData.permlink}`,
    };
  } catch (error) {
    logError(
      'Error updating comment with Wax',
      'updateComment',
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a comment (set body to empty) using WorkerBee
 * @param deleteData - Delete data
 * @returns Delete result
 */
export async function deleteComment(deleteData: {
  author: string;
  permlink: string;
}): Promise<CommentResult> {
  try {
    // "Deleting" a comment on Hive means setting the body to empty
    return await updateComment({
      author: deleteData.author,
      permlink: deleteData.permlink,
      body: '',
      jsonMetadata: JSON.stringify({
        app: 'sportsblock/1.0.0',
        tags: ['deleted', 'sportsblock'],
      }),
    });
  } catch (error) {
    logError(
      'Error deleting comment with WorkerBee',
      'deleteComment',
      error instanceof Error ? error : undefined
    );

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
export async function fetchComments(author: string, permlink: string): Promise<HiveComment[]> {
  try {
    const comments = await makeHiveApiCall('condenser_api', 'get_content_replies', [
      author,
      permlink,
    ]);

    // Use type guard to safely convert API response to typed comments
    return toHiveComments(comments) as HiveComment[];
  } catch (error) {
    logError(
      'Error fetching comments with WorkerBee',
      'fetchCommentsByUser',
      error instanceof Error ? error : undefined
    );
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
    const comment = await makeHiveApiCall('condenser_api', 'get_content', [author, permlink]);

    // Use type guard to safely validate API response
    if (isHiveComment(comment)) {
      return comment as HiveComment;
    }
    return null;
  } catch (error) {
    logError(
      'Error fetching comment with WorkerBee',
      'getComment',
      error instanceof Error ? error : undefined
    );
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
export function buildCommentTree(
  comments: HiveComment[],
  rootAuthor: string,
  rootPermlink: string
): CommentTree[] {
  // Build parent->children index for O(1) lookups instead of O(n) filter per level
  const childrenByParent = new Map<string, HiveComment[]>();
  for (const comment of comments) {
    const parentKey = `${comment.parent_author}/${comment.parent_permlink}`;
    const existing = childrenByParent.get(parentKey);
    if (existing) {
      existing.push(comment);
    } else {
      childrenByParent.set(parentKey, [comment]);
    }
  }

  function buildTree(
    parentAuthor: string,
    parentPermlink: string,
    depth: number = 0
  ): CommentTree[] {
    const children = childrenByParent.get(`${parentAuthor}/${parentPermlink}`) || [];

    return children.map((comment) => ({
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
export async function getCommentStats(
  author: string,
  permlink: string
): Promise<{
  totalComments: number;
  totalReplies: number;
  uniqueAuthors: number;
  pendingPayout: number;
}> {
  try {
    const comments = await fetchComments(author, permlink);

    const uniqueAuthors = new Set(comments.map((c) => c.author)).size;
    const totalReplies = comments.filter((c) => c.depth > 0).length;
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
    logError(
      'Error getting comment stats with WorkerBee',
      'getCommentStats',
      error instanceof Error ? error : undefined
    );
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
export async function getUserComments(
  username: string,
  limit: number = 20
): Promise<HiveComment[]> {
  try {
    workerBeeLog(
      `[getUserComments] Fetching comments for user: ${username} (requested limit: ${limit})`
    );

    // Use get_discussions_by_comments to get recent comments
    // This method is specifically designed for comments and doesn't require date parameters
    // Ensure limit is within valid range (1-20) for get_discussions_by_comments
    const validLimit = Math.min(Math.max(limit, 1), 20);
    workerBeeLog(`[getUserComments] Using valid limit: ${validLimit} (max allowed: 20)`);

    const params = [
      {
        start_author: username,
        start_permlink: '',
        limit: validLimit,
        truncate_body: 0,
      },
    ];

    workerBeeLog('[getUserComments] API call parameters', undefined, params);

    const comments = (await makeHiveApiCall(
      'condenser_api',
      'get_discussions_by_comments',
      params
    )) as HiveComment[];

    workerBeeLog(`[getUserComments] Found ${comments?.length || 0} comments for user ${username}`);

    if (!comments || comments.length === 0) {
      workerBeeLog(`[getUserComments] No comments found for user ${username}`);
      return [];
    }

    // Filter to only comments by the specific user (in case there are replies to their comments)
    const userComments = (comments || []).filter((comment: HiveComment) => {
      return comment.author === username;
    });

    workerBeeLog(`[getUserComments] Found ${userComments.length} comments by user ${username}`);
    return userComments;
  } catch (error) {
    logError(
      'Error fetching user comments with WorkerBee',
      'getUserComments',
      error instanceof Error ? error : undefined,
      error
    );
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
export async function hasUserCommented(
  author: string,
  permlink: string,
  username: string
): Promise<boolean> {
  try {
    const comments = await fetchComments(author, permlink);
    return comments.some((comment) => comment.author === username);
  } catch (error) {
    logError(
      'Error checking user comments with WorkerBee',
      'hasUserCommented',
      error instanceof Error ? error : undefined
    );
    return false;
  }
}

/**
 * Get comment with user's vote information using WorkerBee
 * @param comment - Comment object
 * @param username - Username to check vote for
 * @returns Comment with vote info
 */
export function enrichCommentWithVote(
  comment: HiveComment,
  username: string
): HiveComment & {
  userVote: HiveVote | null;
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
export function sortComments(
  comments: HiveComment[],
  sortBy: 'newest' | 'oldest' | 'votes' | 'payout' = 'newest'
): HiveComment[] {
  switch (sortBy) {
    case 'oldest':
      return [...comments].sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );

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
      return [...comments].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );
  }
}

/**
 * Filter comments by criteria
 * @param comments - Comments to filter
 * @param filters - Filter criteria
 * @returns Filtered comments
 */
export function filterComments(
  comments: HiveComment[],
  filters: {
    minDepth?: number;
    maxDepth?: number;
    authors?: string[];
    minVotes?: number;
    excludeDeleted?: boolean;
  }
): HiveComment[] {
  return comments.filter((comment) => {
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
    const comments = await fetchComments(author, permlink);

    // Filter to get all replies to this specific comment
    return comments.filter(
      (comment) => comment.parent_author === author && comment.parent_permlink === permlink
    );
  } catch (error) {
    logError(
      'Error fetching comment thread with WorkerBee',
      'getCommentThread',
      error instanceof Error ? error : undefined
    );
    return [];
  }
}
