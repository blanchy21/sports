/**
 * Curator Rewards System
 *
 * Processes votes from designated curators and rewards post authors.
 * Curators earn MEDALS for the platform by curating quality content.
 */

import { getCuratorRewardAmount, CURATOR_REWARDS, MEDALS_ACCOUNTS } from './config';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Curator vote information
 */
export interface CuratorVote {
  voter: string;
  author: string;
  permlink: string;
  weight: number;
  timestamp: Date;
  blockNum: number;
  transactionId: string;
}

/**
 * Processed curator reward
 */
export interface CuratorReward {
  author: string;
  curator: string;
  permlink: string;
  amount: number;
  voteTimestamp: Date;
  processedAt: Date;
  transactionId: string;
}

/**
 * Curator daily stats
 */
export interface CuratorDailyStats {
  curator: string;
  date: string;
  votesUsed: number;
  votesRemaining: number;
  totalRewarded: number;
}

/**
 * Get list of designated curator accounts
 * In production, this would be fetched from Firestore or env config
 */
export function getCuratorAccounts(): string[] {
  const envCurators = process.env.CURATOR_ACCOUNTS;
  if (envCurators) {
    return envCurators.split(',').map((c) => c.trim()).filter(Boolean);
  }

  // Default curators
  return ['niallon11', 'bozz', 'talesfrmthecrypt', 'ablaze'];
}

/**
 * Get curator accounts from Firestore (async), with fallback to defaults
 */
export async function getCuratorAccountsAsync(): Promise<string[]> {
  const adminDb = getAdminDb();
  if (adminDb) {
    try {
      const snap = await adminDb.doc('config/curators').get();
      if (snap.exists) {
        const data = snap.data();
        if (Array.isArray(data?.accounts) && data.accounts.length > 0) {
          return data.accounts as string[];
        }
      }
    } catch (e) {
      console.warn('[Curators] Failed to read from Firestore, using defaults', e);
    }
  }
  return getCuratorAccounts();
}

/**
 * Check if an account is a designated curator
 */
export function isCurator(account: string): boolean {
  return getCuratorAccounts().includes(account);
}

/**
 * Get the date key for daily vote tracking
 */
export function getDailyKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate reward for a curator vote
 * Returns 0 if curator has exceeded daily limit
 */
export function calculateCuratorReward(
  curator: string,
  dailyVoteCount: number
): { amount: number; eligible: boolean; reason?: string } {
  // Check if curator is designated
  if (!isCurator(curator)) {
    return {
      amount: 0,
      eligible: false,
      reason: `${curator} is not a designated curator`,
    };
  }

  // Check daily limit
  if (dailyVoteCount >= CURATOR_REWARDS.MAX_VOTES_PER_DAY) {
    return {
      amount: 0,
      eligible: false,
      reason: `Curator ${curator} has reached daily vote limit (${CURATOR_REWARDS.MAX_VOTES_PER_DAY})`,
    };
  }

  // Return reward amount based on platform year
  return {
    amount: getCuratorRewardAmount(),
    eligible: true,
  };
}

/**
 * Generate a unique ID for a curator vote to prevent double processing
 */
export function getVoteUniqueId(vote: CuratorVote): string {
  return `${vote.voter}-${vote.author}-${vote.permlink}-${vote.blockNum}`;
}

/**
 * Build transfer operation for curator reward
 */
export function buildCuratorRewardTransfer(
  author: string,
  amount: number,
  curator: string,
  permlink: string
): {
  contractName: string;
  contractAction: string;
  contractPayload: {
    symbol: string;
    to: string;
    quantity: string;
    memo: string;
  };
} {
  return {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      symbol: 'MEDALS',
      to: author,
      quantity: amount.toFixed(3),
      memo: `Curator reward from @${curator} for your post: ${permlink}`,
    },
  };
}

/**
 * Filter votes to only include those from designated curators
 * on the Sportsblock community
 */
export function filterCuratorVotes(
  votes: CuratorVote[],
  processedVoteIds: Set<string>
): CuratorVote[] {
  const curators = getCuratorAccounts();

  return votes.filter((vote) => {
    // Must be from a curator
    if (!curators.includes(vote.voter)) {
      return false;
    }

    // Must be a positive vote (upvote)
    if (vote.weight <= 0) {
      return false;
    }

    // Must not already be processed
    const voteId = getVoteUniqueId(vote);
    if (processedVoteIds.has(voteId)) {
      return false;
    }

    return true;
  });
}

/**
 * Process a batch of curator votes and calculate rewards
 */
export function processCuratorVotes(
  votes: CuratorVote[],
  curatorDailyStats: Map<string, number>
): {
  rewards: CuratorReward[];
  updatedStats: Map<string, number>;
  skipped: Array<{ vote: CuratorVote; reason: string }>;
} {
  const rewards: CuratorReward[] = [];
  const skipped: Array<{ vote: CuratorVote; reason: string }> = [];
  const updatedStats = new Map(curatorDailyStats);
  const processedAt = new Date();

  for (const vote of votes) {
    const currentDailyCount = updatedStats.get(vote.voter) || 0;
    const rewardCalc = calculateCuratorReward(vote.voter, currentDailyCount);

    if (!rewardCalc.eligible) {
      skipped.push({ vote, reason: rewardCalc.reason || 'Not eligible' });
      continue;
    }

    rewards.push({
      author: vote.author,
      curator: vote.voter,
      permlink: vote.permlink,
      amount: rewardCalc.amount,
      voteTimestamp: vote.timestamp,
      processedAt,
      transactionId: vote.transactionId,
    });

    // Update daily count
    updatedStats.set(vote.voter, currentDailyCount + 1);
  }

  return { rewards, updatedStats, skipped };
}

/**
 * Get curator stats summary
 */
export function getCuratorStatsSummary(
  curatorDailyStats: Map<string, number>
): CuratorDailyStats[] {
  const curators = getCuratorAccounts();
  const today = getDailyKey();
  const rewardAmount = getCuratorRewardAmount();

  return curators.map((curator) => {
    const votesUsed = curatorDailyStats.get(curator) || 0;
    return {
      curator,
      date: today,
      votesUsed,
      votesRemaining: Math.max(0, CURATOR_REWARDS.MAX_VOTES_PER_DAY - votesUsed),
      totalRewarded: votesUsed * rewardAmount,
    };
  });
}

/**
 * Get the rewards source account
 */
export function getCuratorRewardsAccount(): string {
  return MEDALS_ACCOUNTS.REWARDS;
}
