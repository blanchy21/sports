import { makeWorkerBeeApiCall } from './api';
import { aioha } from '@/lib/aioha/config';
import { createVoteOperation, getVotingPowerWax } from './wax-helpers';
import { workerBee as workerBeeLog, error as logError, debug as logDebug } from './logger';
import { waitForTransaction } from './transaction-confirmation';
import type { AiohaInstance } from '@/lib/aioha/types';

// Types matching the original voting.ts interface
export interface VoteResult {
  success: boolean;
  transactionId?: string;
  confirmed?: boolean;
  error?: string;
}

export interface VoteData {
  voter: string;
  author: string;
  permlink: string;
  weight: number; // 0-100 percentage
}

export interface HiveVote {
  voter: string;
  weight: number;
  rshares: string;
  percent: number;
  reputation: string;
  time: string;
}

// Utility functions
function getUserVote(post: { active_votes?: HiveVote[] }, voter: string): HiveVote | null {
  if (!post.active_votes) return null;
  return post.active_votes.find((vote: HiveVote) => vote.voter === voter) || null;
}

/**
 * Cast a vote on a post or comment using Wax
 * @param voteData - Vote data
 * @returns Vote result
 */
export async function castVote(voteData: VoteData): Promise<VoteResult> {
  try {
    if (!aioha) {
      throw new Error(
        'Aioha authentication is not available. Please refresh the page and try again.'
      );
    }

    // Create vote operation using Wax helpers
    const operation = createVoteOperation({
      voter: voteData.voter,
      author: voteData.author,
      permlink: voteData.permlink,
      weight: voteData.weight,
    });

    workerBeeLog('[castVote] Wax vote operation created', undefined, operation);

    // Use Aioha to sign and broadcast the transaction
    // Aioha expects operations in a specific format - each operation should be an array
    // Format: [operation_type, operation_data]
    const operations = [['vote', operation]];

    const result = await (aioha as AiohaInstance).signAndBroadcastTx!(operations, 'posting');

    const transactionId = (result as { id?: string })?.id || 'unknown';

    // Confirm transaction was included in a block
    const confirmation = await waitForTransaction(transactionId);

    return {
      success: true,
      transactionId,
      confirmed: confirmation.confirmed,
    };
  } catch (error) {
    logError('Error casting vote with Wax', 'castVote', error instanceof Error ? error : undefined);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove a vote (set weight to 0) using Aioha
 * @param voteData - Vote data (weight will be set to 0)
 * @returns Vote result
 */
export async function removeVote(voteData: Omit<VoteData, 'weight'>): Promise<VoteResult> {
  return castVote({ ...voteData, weight: 0 });
}

/**
 * Check if user has voted on a post/comment using WorkerBee
 * @param author - Post author
 * @param permlink - Post permlink
 * @param voter - Voter username
 * @returns Vote information or null if not voted
 */
export async function checkUserVote(
  author: string,
  permlink: string,
  voter: string
): Promise<HiveVote | null> {
  try {
    // Use WorkerBee API call for better node management
    const post = await makeWorkerBeeApiCall<Record<string, unknown>>('get_content', [
      author,
      permlink,
    ]);

    // Hive returns a stub with empty author for posts not yet on chain (e.g. optimistic bites)
    if (!post || !post.author) return null;

    return getUserVote(post as { active_votes?: HiveVote[] }, voter);
  } catch (error) {
    // Non-critical: vote status check can fail for just-posted content or transient network issues.
    // Returning null lets the UI render without vote state, which is the correct fallback.
    logDebug(`Vote status check failed for ${author}/${permlink} by ${voter}`, 'checkUserVote', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get all votes for a post/comment using WorkerBee/Wax
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Array of votes
 */
export async function getPostVotes(author: string, permlink: string): Promise<HiveVote[]> {
  try {
    // Use WorkerBee API call for better node management
    const post = await makeWorkerBeeApiCall<{ active_votes?: HiveVote[] }>('get_content', [
      author,
      permlink,
    ]);

    if (!post || !post.active_votes) return [];

    return post.active_votes;
  } catch (error) {
    logError(
      'Error fetching post votes with WorkerBee',
      'getPostVotes',
      error instanceof Error ? error : undefined
    );
    return [];
  }
}

/**
 * Get user's voting power using Wax
 * @param username - Username
 * @returns Voting power percentage (0-100)
 */
export async function getUserVotingPower(username: string): Promise<number> {
  try {
    workerBeeLog(`[getUserVotingPower] Getting voting power for ${username} using Wax`);

    // Use Wax helpers for voting power
    const votingPower = await getVotingPowerWax(username);

    workerBeeLog(
      `[getUserVotingPower] User ${username} has ${votingPower.toFixed(2)}% voting power`
    );
    return votingPower;
  } catch (error) {
    logError(
      'Error fetching voting power with Wax',
      'getUserVotingPower',
      error instanceof Error ? error : undefined
    );

    // Fallback to original method if Wax fails
    try {
      workerBeeLog('[getUserVotingPower] Falling back to original method');
      const account = await makeWorkerBeeApiCall<Array<{ voting_power: number }>>('get_accounts', [
        [username],
      ]);

      if (!account || account.length === 0) return 0;

      return (account[0] as { voting_power: number }).voting_power / 100; // Convert from 0-10000 to 0-100
    } catch (fallbackError) {
      logError(
        'Error in fallback voting power check',
        'getUserVotingPower',
        fallbackError instanceof Error ? fallbackError : undefined
      );
      return 0;
    }
  }
}

/**
 * Calculate optimal vote weight based on voting power and time since last vote using WorkerBee
 * @param username - Username
 * @param lastVoteTime - Last vote timestamp
 * @returns Recommended vote weight (0-100)
 */
export async function calculateOptimalVoteWeight(
  username: string,
  lastVoteTime?: Date
): Promise<number> {
  try {
    const votingPower = await getUserVotingPower(username);

    // Voting power regenerates at 20% per day
    const now = new Date();
    const timeSinceLastVote = lastVoteTime
      ? now.getTime() - lastVoteTime.getTime()
      : 24 * 60 * 60 * 1000; // Default 24 hours
    const hoursSinceLastVote = timeSinceLastVote / (1000 * 60 * 60);
    const regeneratedPower = Math.min(100, votingPower + (hoursSinceLastVote * 20) / 24);

    // Recommend using 100% if voting power is high, otherwise scale down
    if (regeneratedPower > 80) return 100;
    if (regeneratedPower > 60) return 80;
    if (regeneratedPower > 40) return 60;
    if (regeneratedPower > 20) return 40;
    return 20;
  } catch (error) {
    logError(
      'Error calculating optimal vote weight with WorkerBee',
      'calculateOptimalVoteWeight',
      error instanceof Error ? error : undefined
    );
    return 50; // Default to 50% on error
  }
}

/**
 * Get vote statistics for a post using WorkerBee/Wax
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Vote statistics
 */
export async function getVoteStats(
  author: string,
  permlink: string
): Promise<{
  totalVotes: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  totalPercent: number;
  averagePercent: number;
  pendingPayout: number;
}> {
  try {
    // Use WorkerBee API call for better node management
    const post = await makeWorkerBeeApiCall<{
      active_votes?: HiveVote[];
      net_votes?: number;
      pending_payout_value?: string;
    }>('get_content', [author, permlink]);

    if (!post) {
      return {
        totalVotes: 0,
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        totalPercent: 0,
        averagePercent: 0,
        pendingPayout: 0,
      };
    }

    const votes = (post as { active_votes?: HiveVote[] }).active_votes || [];
    const upvotes = votes.filter((vote: HiveVote) => vote.weight > 0).length;
    const downvotes = votes.filter((vote: HiveVote) => vote.weight < 0).length;
    const totalPercent = votes.reduce(
      (sum: number, vote: HiveVote) => sum + Math.abs(vote.percent),
      0
    );
    const averagePercent = votes.length > 0 ? totalPercent / votes.length : 0;

    return {
      totalVotes: votes.length,
      upvotes,
      downvotes,
      netVotes: (post as { net_votes?: number }).net_votes || 0,
      totalPercent,
      averagePercent,
      pendingPayout: parseFloat(
        (post as { pending_payout_value?: string }).pending_payout_value || '0'
      ),
    };
  } catch (error) {
    logError(
      'Error fetching vote stats with WorkerBee',
      'getVoteStats',
      error instanceof Error ? error : undefined
    );
    return {
      totalVotes: 0,
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      totalPercent: 0,
      averagePercent: 0,
      pendingPayout: 0,
    };
  }
}

/**
 * Vote history entry from account history
 */
export interface VoteHistoryEntry {
  author: string;
  permlink: string;
  weight: number;
  timestamp: Date;
  postTitle: string;
}

/**
 * Get recent votes by a user using account history API
 * @param username - Username
 * @param limit - Number of votes to fetch (max 1000)
 * @returns Recent votes
 */
export async function getUserRecentVotes(
  username: string,
  limit: number = 20
): Promise<VoteHistoryEntry[]> {
  try {
    workerBeeLog(`Fetching recent votes for ${username} with WorkerBee, limit: ${limit}`);

    // Fetch account history - start from -1 (most recent) and work backwards
    // Request more than limit since we need to filter for vote operations only
    const batchSize = Math.min(limit * 5, 1000);
    const history = await makeWorkerBeeApiCall<
      Array<
        [
          number,
          {
            op: [
              string,
              {
                voter?: string;
                author?: string;
                permlink?: string;
                weight?: number;
              },
            ];
            timestamp: string;
          },
        ]
      >
    >('get_account_history', [username, -1, batchSize]);

    if (!history || !Array.isArray(history)) {
      return [];
    }

    // Filter for vote operations and map to our format
    const votes: VoteHistoryEntry[] = [];

    for (const [, entry] of history) {
      if (!entry || !entry.op) continue;

      const [opType, opData] = entry.op;

      // Only process vote operations
      if (opType !== 'vote') continue;

      // Only include votes by this user (not votes on their content)
      if (opData.voter !== username) continue;

      votes.push({
        author: opData.author || '',
        permlink: opData.permlink || '',
        weight: (opData.weight || 0) / 100, // Convert from basis points to percentage
        timestamp: new Date(entry.timestamp + 'Z'),
        postTitle: '', // Would need additional API call to get title
      });

      // Stop if we have enough votes
      if (votes.length >= limit) break;
    }

    // Sort by timestamp descending (newest first)
    votes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    workerBeeLog(`Found ${votes.length} votes for ${username}`);
    return votes.slice(0, limit);
  } catch (error) {
    logError(
      'Error fetching user recent votes with WorkerBee',
      'getRecentVotes',
      error instanceof Error ? error : undefined
    );
    return [];
  }
}

/**
 * Check if user can vote (voting power, rate limits, etc.) using WorkerBee/Wax
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
        reason: 'Insufficient voting power (less than 1%)',
      };
    }

    return {
      canVote: true,
      votingPower,
    };
  } catch (error) {
    logError(
      'Error checking voting eligibility with WorkerBee',
      'canUserVote',
      error instanceof Error ? error : undefined
    );
    return {
      canVote: false,
      votingPower: 0,
      reason: 'Error checking voting power',
    };
  }
}

/**
 * Generate HiveSigner URL for voting (for users without posting keys)
 * @param voteData - Vote data
 * @returns HiveSigner voting URL
 */
export function getHiveSignerVoteUrl(voteData: VoteData): string {
  // This would need to be implemented with actual HiveSigner integration
  // For now, return a placeholder URL
  const baseUrl = 'https://hivesigner.com/sign/vote';
  const params = new URLSearchParams({
    author: voteData.author,
    permlink: voteData.permlink,
    voter: voteData.voter,
    weight: (voteData.weight * 100).toString(),
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Batch vote on multiple posts using Wax
 * @param votes - Array of vote data
 * @returns Vote results
 */
export async function batchVote(votes: VoteData[]): Promise<VoteResult[]> {
  try {
    workerBeeLog(`[batchVote] Processing ${votes.length} votes using Wax`);

    // Create multiple vote operations using Wax helpers
    const operations = votes.map((vote) =>
      createVoteOperation({
        voter: vote.voter,
        author: vote.author,
        permlink: vote.permlink,
        weight: vote.weight,
      })
    );

    workerBeeLog('[batchVote] Created Wax vote operations', undefined, operations);

    // Use Aioha to sign and broadcast all operations in a single transaction
    // Aioha expects operations in a specific format - each operation should be an array
    // Format: [operation_type, operation_data]
    const aiohaOperations = operations.map((op) => ['vote', op]);

    const result = await (aioha as AiohaInstance).signAndBroadcastTx!(aiohaOperations, 'posting');

    workerBeeLog(
      `[batchVote] Batch vote completed with transaction ID: ${(result as { id?: string })?.id}`
    );

    return votes.map(() => ({
      success: true,
      transactionId: (result as { id?: string })?.id || 'unknown',
    }));
  } catch (error) {
    logError(
      'Error batch voting with Wax',
      'batchVote',
      error instanceof Error ? error : undefined
    );

    return votes.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

/**
 * Get vote history for a specific post using WorkerBee
 * @param author - Post author
 * @param permlink - Post permlink
 * @param limit - Number of votes to fetch
 * @returns Vote history
 */
export async function getVoteHistory(
  author: string,
  permlink: string,
  limit: number = 50
): Promise<HiveVote[]> {
  try {
    // Use WorkerBee API call for better node management
    const post = await makeWorkerBeeApiCall<{ active_votes?: HiveVote[] }>('get_content', [
      author,
      permlink,
    ]);

    if (!post || !post.active_votes) return [];

    // Sort by timestamp (newest first) and limit
    return post.active_votes
      .sort((a: HiveVote, b: HiveVote) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
  } catch (error) {
    logError(
      'Error fetching vote history with WorkerBee',
      'getVoteHistory',
      error instanceof Error ? error : undefined
    );
    return [];
  }
}
