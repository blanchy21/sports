import { getHiveClient } from './client';
import { HiveVote } from './types';
import { 
  getUserVote, 
  handleHiveError,
  generateHiveSignerVoteUrl
} from './utils';
import { PrivateKey } from '@hiveio/dhive';

export interface VoteResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface VoteData {
  voter: string;
  author: string;
  permlink: string;
  weight: number; // 0-100 percentage
}

/**
 * Cast a vote on a post or comment
 * @param voteData - Vote data
 * @param postingKey - User's posting private key
 * @returns Vote result
 */
export async function castVote(voteData: VoteData, postingKey: string | PrivateKey): Promise<VoteResult> {
  try {
    const client = getHiveClient();
    
    // Validate vote weight (0-100)
    if (voteData.weight < 0 || voteData.weight > 100) {
      throw new Error('Vote weight must be between 0 and 100');
    }

    // Convert string key to PrivateKey object if needed
    const key = typeof postingKey === 'string' ? PrivateKey.from(postingKey) : postingKey;

    // Create vote operation as tuple
    const operation: ['vote', { voter: string; author: string; permlink: string; weight: number }] = [
      'vote',
      {
        voter: voteData.voter,
        author: voteData.author,
        permlink: voteData.permlink,
        weight: voteData.weight * 100, // Convert to 0-10000 scale
      }
    ];

    // Broadcast the transaction
    const result = await client.broadcast.sendOperations([operation], key);

    return {
      success: true,
      transactionId: result.id,
    };
  } catch (error) {
    console.error('Error casting vote:', error);
    const hiveError = handleHiveError(error);
    
    return {
      success: false,
      error: hiveError.message,
    };
  }
}

/**
 * Remove a vote (set weight to 0)
 * @param voteData - Vote data (weight will be set to 0)
 * @param postingKey - User's posting private key
 * @returns Vote result
 */
export async function removeVote(voteData: Omit<VoteData, 'weight'>, postingKey: string | PrivateKey): Promise<VoteResult> {
  return castVote({ ...voteData, weight: 0 }, postingKey);
}

/**
 * Check if user has voted on a post/comment
 * @param author - Post author
 * @param permlink - Post permlink
 * @param voter - Voter username
 * @returns Vote information or null if not voted
 */
export async function checkUserVote(author: string, permlink: string, voter: string): Promise<HiveVote | null> {
  try {
    const client = getHiveClient();
    const post = await client.database.call('get_content', [author, permlink]);
    
    if (!post) return null;
    
    return getUserVote(post, voter);
  } catch (error) {
    console.error('Error checking user vote:', error);
    return null;
  }
}

/**
 * Get all votes for a post/comment
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Array of votes
 */
export async function getPostVotes(author: string, permlink: string): Promise<HiveVote[]> {
  try {
    const client = getHiveClient();
    const post = await client.database.call('get_content', [author, permlink]);
    
    if (!post || !post.active_votes) return [];
    
    return post.active_votes;
  } catch (error) {
    console.error('Error fetching post votes:', error);
    return [];
  }
}

/**
 * Get user's voting power
 * @param username - Username
 * @returns Voting power percentage (0-100)
 */
export async function getUserVotingPower(username: string): Promise<number> {
  try {
    const client = getHiveClient();
    const account = await client.database.getAccounts([username]);
    
    if (!account || account.length === 0) return 0;
    
    return account[0].voting_power / 100; // Convert from 0-10000 to 0-100
  } catch (error) {
    console.error('Error fetching voting power:', error);
    return 0;
  }
}

/**
 * Calculate optimal vote weight based on voting power and time since last vote
 * @param username - Username
 * @param lastVoteTime - Last vote timestamp
 * @returns Recommended vote weight (0-100)
 */
export async function calculateOptimalVoteWeight(username: string, lastVoteTime?: Date): Promise<number> {
  try {
    const votingPower = await getUserVotingPower(username);
    
    // Voting power regenerates at 20% per day
    const now = new Date();
    const timeSinceLastVote = lastVoteTime ? now.getTime() - lastVoteTime.getTime() : 24 * 60 * 60 * 1000; // Default 24 hours
    const hoursSinceLastVote = timeSinceLastVote / (1000 * 60 * 60);
    const regeneratedPower = Math.min(100, votingPower + (hoursSinceLastVote * 20 / 24));
    
    // Recommend using 100% if voting power is high, otherwise scale down
    if (regeneratedPower > 80) return 100;
    if (regeneratedPower > 60) return 80;
    if (regeneratedPower > 40) return 60;
    if (regeneratedPower > 20) return 40;
    return 20;
  } catch (error) {
    console.error('Error calculating optimal vote weight:', error);
    return 50; // Default to 50% on error
  }
}

/**
 * Get vote statistics for a post
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Vote statistics
 */
export async function getVoteStats(author: string, permlink: string): Promise<{
  totalVotes: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  totalWeight: number;
  averageWeight: number;
  pendingPayout: number;
}> {
  try {
    const client = getHiveClient();
    const post = await client.database.call('get_content', [author, permlink]);
    
    if (!post) {
      return {
        totalVotes: 0,
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        totalWeight: 0,
        averageWeight: 0,
        pendingPayout: 0,
      };
    }

    const votes = post.active_votes || [];
    const upvotes = votes.filter((vote: HiveVote) => vote.weight > 0).length;
    const downvotes = votes.filter((vote: HiveVote) => vote.weight < 0).length;
    const totalWeight = votes.reduce((sum: number, vote: HiveVote) => sum + Math.abs(vote.weight), 0);
    const averageWeight = votes.length > 0 ? totalWeight / votes.length : 0;

    return {
      totalVotes: votes.length,
      upvotes,
      downvotes,
      netVotes: post.net_votes || 0,
      totalWeight,
      averageWeight,
      pendingPayout: parseFloat(post.pending_payout_value || '0'),
    };
  } catch (error) {
    console.error('Error fetching vote stats:', error);
    return {
      totalVotes: 0,
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      totalWeight: 0,
      averageWeight: 0,
      pendingPayout: 0,
    };
  }
}

/**
 * Get recent votes by a user
 * @param username - Username
 * @param limit - Number of votes to fetch
 * @returns Recent votes
 */
export async function getUserRecentVotes(username: string, limit: number = 20): Promise<Array<{
  author: string;
  permlink: string;
  weight: number;
  timestamp: Date;
  postTitle: string;
}>> {
  try {
    // This would require additional API calls to get user's voting history
    // For now, return empty array - implement with actual API when available
    // TODO: Implement with Hivemind API or custom voting history endpoint
    console.log(`Fetching recent votes for ${username}, limit: ${limit}`);
    return [];
  } catch (error) {
    console.error('Error fetching user recent votes:', error);
    return [];
  }
}

/**
 * Check if user can vote (voting power, rate limits, etc.)
 * @param username - Username
 * @returns Voting eligibility info
 */
export async function canUserVote(username: string): Promise<{
  canVote: boolean;
  votingPower: number;
  reason?: string;
}> {
  try {
    const votingPower = await getUserVotingPower(username);
    
    if (votingPower < 1) {
      return {
        canVote: false,
        votingPower,
        reason: 'Insufficient voting power (less than 1%)'
      };
    }

    return {
      canVote: true,
      votingPower,
    };
  } catch (error) {
    console.error('Error checking voting eligibility:', error);
    return {
      canVote: false,
      votingPower: 0,
      reason: 'Error checking voting power'
    };
  }
}

/**
 * Generate HiveSigner URL for voting (for users without posting keys)
 * @param voteData - Vote data
 * @returns HiveSigner voting URL
 */
export function getHiveSignerVoteUrl(voteData: VoteData): string {
  return generateHiveSignerVoteUrl(
    voteData.author,
    voteData.permlink,
    voteData.voter,
    voteData.weight
  );
}

/**
 * Batch vote on multiple posts (requires custom implementation)
 * @param votes - Array of vote data
 * @param postingKey - User's posting private key
 * @returns Vote results
 */
export async function batchVote(votes: VoteData[], postingKey: string | PrivateKey): Promise<VoteResult[]> {
  try {
    const client = getHiveClient();
    
    // Convert string key to PrivateKey object if needed
    const key = typeof postingKey === 'string' ? PrivateKey.from(postingKey) : postingKey;
    
    // Create multiple vote operations as tuples
    const operations: Array<['vote', { voter: string; author: string; permlink: string; weight: number }]> = votes.map(vote => [
      'vote',
      {
        voter: vote.voter,
        author: vote.author,
        permlink: vote.permlink,
        weight: vote.weight * 100,
      }
    ]);

    // Broadcast all operations in a single transaction
    const result = await client.broadcast.sendOperations(operations, key);

    return votes.map(() => ({
      success: true,
      transactionId: result.id,
    }));
  } catch (error) {
    console.error('Error batch voting:', error);
    const hiveError = handleHiveError(error);
    
    return votes.map(() => ({
      success: false,
      error: hiveError.message,
    }));
  }
}

/**
 * Get vote history for a specific post
 * @param author - Post author
 * @param permlink - Post permlink
 * @param limit - Number of votes to fetch
 * @returns Vote history
 */
export async function getVoteHistory(author: string, permlink: string, limit: number = 50): Promise<HiveVote[]> {
  try {
    const client = getHiveClient();
    const post = await client.database.call('get_content', [author, permlink]);
    
    if (!post || !post.active_votes) return [];
    
    // Sort by timestamp (newest first) and limit
    return post.active_votes
      .sort((a: HiveVote, b: HiveVote) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching vote history:', error);
    return [];
  }
}
