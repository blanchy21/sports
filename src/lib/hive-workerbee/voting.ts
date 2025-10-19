import { initializeWorkerBeeClient } from './client';
import { aioha } from '@/lib/aioha/config';

// Types for Hive API responses
interface HiveApiResponse<T = unknown> {
  id: number;
  result: T;
  error?: {
    code: number;
    message: string;
  };
}

// Helper function to make direct HTTP calls to Hive API
// WorkerBee is designed for event-driven automation, not direct API calls
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
  
  const result: HiveApiResponse<T> = await response.json();
  
  if (result.error) {
    throw new Error(`API error: ${result.error.message}`);
  }
  
  return result.result;
}

// Types matching the original voting.ts interface
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
 * Cast a vote on a post or comment using Aioha
 * @param voteData - Vote data
 * @returns Vote result
 */
export async function castVote(voteData: VoteData): Promise<VoteResult> {
  try {
    if (!aioha) {
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    // Validate vote weight (0-100)
    if (voteData.weight < 0 || voteData.weight > 100) {
      throw new Error('Vote weight must be between 0 and 100');
    }

    // Create vote operation
    const operation = {
      voter: voteData.voter,
      author: voteData.author,
      permlink: voteData.permlink,
      weight: voteData.weight * 100, // Convert to 0-10000 scale
    };

    // Use Aioha to sign and broadcast the transaction
    const result = await (aioha as { signAndBroadcastTx: (ops: unknown[], keyType: string) => Promise<unknown> }).signAndBroadcastTx([operation], 'posting');

    return {
      success: true,
      transactionId: (result as { id?: string })?.id || 'unknown',
    };
  } catch (error) {
    console.error('Error casting vote with Aioha:', error);
    
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
export async function checkUserVote(author: string, permlink: string, voter: string): Promise<HiveVote | null> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const post = await makeHiveApiCall<Record<string, unknown>>('condenser_api', 'get_content', [author, permlink]);
    
    if (!post) return null;
    
    return getUserVote(post, voter);
  } catch (error) {
    console.error('Error checking user vote with WorkerBee:', error);
    return null;
  }
}

/**
 * Get all votes for a post/comment using WorkerBee
 * @param author - Post author
 * @param permlink - Post permlink
 * @returns Array of votes
 */
export async function getPostVotes(author: string, permlink: string): Promise<HiveVote[]> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const post = await makeHiveApiCall<Record<string, unknown>>('condenser_api', 'get_content', [author, permlink]);
    
    if (!post || !(post as { active_votes?: HiveVote[] }).active_votes) return [];
    
    return (post as { active_votes: HiveVote[] }).active_votes;
  } catch (error) {
    console.error('Error fetching post votes with WorkerBee:', error);
    return [];
  }
}

/**
 * Get user's voting power using WorkerBee
 * @param username - Username
 * @returns Voting power percentage (0-100)
 */
export async function getUserVotingPower(username: string): Promise<number> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const account = await makeHiveApiCall<Array<Record<string, unknown>>>('condenser_api', 'get_accounts', [[username]]);
    
    if (!account || account.length === 0) return 0;
    
    return ((account[0] as { voting_power: number }).voting_power / 100); // Convert from 0-10000 to 0-100
  } catch (error) {
    console.error('Error fetching voting power with WorkerBee:', error);
    return 0;
  }
}

/**
 * Calculate optimal vote weight based on voting power and time since last vote using WorkerBee
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
    console.error('Error calculating optimal vote weight with WorkerBee:', error);
    return 50; // Default to 50% on error
  }
}

/**
 * Get vote statistics for a post using WorkerBee
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
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const post = await makeHiveApiCall<Record<string, unknown>>('condenser_api', 'get_content', [author, permlink]);
    
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

    const votes = (post as { active_votes?: HiveVote[] }).active_votes || [];
    const upvotes = votes.filter((vote: HiveVote) => vote.weight > 0).length;
    const downvotes = votes.filter((vote: HiveVote) => vote.weight < 0).length;
    const totalWeight = votes.reduce((sum: number, vote: HiveVote) => sum + Math.abs(vote.weight), 0);
    const averageWeight = votes.length > 0 ? totalWeight / votes.length : 0;

    return {
      totalVotes: votes.length,
      upvotes,
      downvotes,
      netVotes: (post as { net_votes?: number }).net_votes || 0,
      totalWeight,
      averageWeight,
      pendingPayout: parseFloat((post as { pending_payout_value?: string }).pending_payout_value || '0'),
    };
  } catch (error) {
    console.error('Error fetching vote stats with WorkerBee:', error);
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
 * Get recent votes by a user using WorkerBee
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
    console.log(`Fetching recent votes for ${username} with WorkerBee, limit: ${limit}`);
    return [];
  } catch (error) {
    console.error('Error fetching user recent votes with WorkerBee:', error);
    return [];
  }
}

/**
 * Check if user can vote (voting power, rate limits, etc.) using WorkerBee
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
    console.error('Error checking voting eligibility with WorkerBee:', error);
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
  // This would need to be implemented with actual HiveSigner integration
  // For now, return a placeholder URL
  const baseUrl = 'https://hivesigner.com/sign/vote';
  const params = new URLSearchParams({
    author: voteData.author,
    permlink: voteData.permlink,
    voter: voteData.voter,
    weight: (voteData.weight * 100).toString()
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Batch vote on multiple posts using Aioha
 * @param votes - Array of vote data
 * @returns Vote results
 */
export async function batchVote(votes: VoteData[]): Promise<VoteResult[]> {
  try {
    // Create multiple vote operations
    const operations = votes.map(vote => ({
      voter: vote.voter,
      author: vote.author,
      permlink: vote.permlink,
      weight: vote.weight * 100,
    }));

    // Use Aioha to sign and broadcast all operations in a single transaction
    const result = await (aioha as { signAndBroadcastTx: (ops: unknown[], keyType: string) => Promise<unknown> }).signAndBroadcastTx(operations, 'posting');

    return votes.map(() => ({
      success: true,
      transactionId: (result as { id?: string })?.id || 'unknown',
    }));
  } catch (error) {
    console.error('Error batch voting with Aioha:', error);
    
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
export async function getVoteHistory(author: string, permlink: string, limit: number = 50): Promise<HiveVote[]> {
  try {
    // Initialize WorkerBee client (for future use with real-time features)
    await initializeWorkerBeeClient();

    const post = await makeHiveApiCall<Record<string, unknown>>('condenser_api', 'get_content', [author, permlink]);
    
    if (!post || !(post as { active_votes?: HiveVote[] }).active_votes) return [];
    
    // Sort by timestamp (newest first) and limit
    return (post as { active_votes: HiveVote[] }).active_votes
      .sort((a: HiveVote, b: HiveVote) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching vote history with WorkerBee:', error);
    return [];
  }
}
