import { getHiveClient } from './client';
import { HiveComment } from './types';
import { 
  parseJsonMetadata,
  handleHiveError,
  calculateReputation,
  getUserVote
} from './utils';
import { PrivateKey } from '@hiveio/dhive';

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

/**
 * Post a comment/reply to a post or another comment
 * @param commentData - Comment data
 * @param postingKey - User's posting private key
 * @returns Comment result
 */
export async function postComment(commentData: CommentData, postingKey: string | PrivateKey): Promise<CommentResult> {
  try {
    const client = getHiveClient();
    
    // Convert string key to PrivateKey object if needed
    const key = typeof postingKey === 'string' ? PrivateKey.from(postingKey) : postingKey;
    
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

    // Create the comment operation as tuple
    const operation: ['comment', {
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
    }] = [
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
        percent_hbd: 10000, // 100% HBD
        allow_votes: true,
        allow_curation_rewards: true,
      }
    ];

    // Broadcast the transaction
    const result = await client.broadcast.sendOperations([operation], key);
    
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
    console.error('Error posting comment:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Update an existing comment
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
  postingKey: string | PrivateKey
): Promise<CommentResult> {
  try {
    const client = getHiveClient();
    
    // Convert string key to PrivateKey object if needed
    const key = typeof postingKey === 'string' ? PrivateKey.from(postingKey) : postingKey;
    
    // Get existing comment to preserve some data
    const existingComment = await client.database.call('get_content', [updateData.author, updateData.permlink]);
    if (!existingComment) {
      throw new Error('Comment not found');
    }

    // Check if comment can still be updated (within 7 days)
    const commentAge = Date.now() - new Date(existingComment.created).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (commentAge > sevenDays) {
      throw new Error('Comment cannot be updated after 7 days');
    }

    // Merge metadata
    const existingMetadata = parseJsonMetadata(existingComment.json_metadata);
    const updateMetadata = updateData.jsonMetadata ? parseJsonMetadata(updateData.jsonMetadata) : {};
    const mergedMetadata = { ...existingMetadata, ...updateMetadata };

    // Create the update operation as tuple
    const operation: ['comment', {
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
    }] = [
      'comment',
      {
        parent_author: existingComment.parent_author,
        parent_permlink: existingComment.parent_permlink,
        author: updateData.author,
        permlink: updateData.permlink,
        title: '', // Comments don't have titles
        body: updateData.body,
        json_metadata: JSON.stringify(mergedMetadata),
        max_accepted_payout: existingComment.max_accepted_payout,
        percent_hbd: existingComment.percent_hbd,
        allow_votes: existingComment.allow_votes,
        allow_curation_rewards: existingComment.allow_curation_rewards,
      }
    ];

    // Broadcast the transaction
    const result = await client.broadcast.sendOperations([operation], key);

    return {
      success: true,
      transactionId: result.id,
      author: updateData.author,
      permlink: updateData.permlink,
      url: `https://hive.blog/@${updateData.author}/${updateData.permlink}`,
    };
  } catch (error) {
    console.error('Error updating comment:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Delete a comment (set body to empty)
 * @param deleteData - Delete data
 * @param postingKey - User's posting private key
 * @returns Delete result
 */
export async function deleteComment(
  deleteData: {
    author: string;
    permlink: string;
  },
  postingKey: string
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
    }, postingKey);
  } catch (error) {
    console.error('Error deleting comment:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Fetch comments for a post
 * @param author - Post author
 * @param permlink - Post permlink
 * @param limit - Number of comments to fetch
 * @returns Array of comments
 */
export async function fetchComments(author: string, permlink: string, limit: number = 100): Promise<HiveComment[]> {
  try {
    const client = getHiveClient();
    const comments = await client.database.call('get_content_replies', [author, permlink, limit]);
    
    return comments || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Fetch a single comment by author and permlink
 * @param author - Comment author
 * @param permlink - Comment permlink
 * @returns Comment data
 */
export async function fetchComment(author: string, permlink: string): Promise<HiveComment | null> {
  try {
    const client = getHiveClient();
    const comment = await client.database.call('get_content', [author, permlink]);
    
    return comment || null;
  } catch (error) {
    console.error('Error fetching comment:', error);
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
 * Get comment statistics
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
    console.error('Error getting comment stats:', error);
    return {
      totalComments: 0,
      totalReplies: 0,
      uniqueAuthors: 0,
      pendingPayout: 0,
    };
  }
}

/**
 * Get user's recent comments
 * @param username - Username
 * @param limit - Number of comments to fetch
 * @returns Recent comments
 */
export async function getUserComments(username: string, limit: number = 20): Promise<HiveComment[]> {
  try {
    const client = getHiveClient();
    const comments = await client.database.call('get_discussions_by_author_before_date', [
      username,
      '',
      '',
      limit
    ]);

    // Filter to only comments (posts with parent_author)
    return (comments || []).filter((comment: HiveComment) => comment.parent_author !== '');
  } catch (error) {
    console.error('Error fetching user comments:', error);
    return [];
  }
}

/**
 * Check if user has commented on a post
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
    console.error('Error checking user comments:', error);
    return false;
  }
}

/**
 * Get comment with user's vote information
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
 * Get comment thread (all replies to a specific comment)
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
    console.error('Error fetching comment thread:', error);
    return [];
  }
}
