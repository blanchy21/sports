/** @jest-environment node */

import {
  castVote,
  removeVote,
  checkUserVote,
  getPostVotes,
  getUserVotingPower,
  calculateOptimalVoteWeight,
  getVoteStats,
  getUserRecentVotes,
  canUserVote,
  getHiveSignerVoteUrl,
  batchVote,
  getVoteHistory,
} from '@/lib/hive-workerbee/voting';
import type { VoteData } from '@/lib/hive-workerbee/voting';

// Mock dependencies
jest.mock('@/lib/aioha/config', () => ({
  aioha: {
    signAndBroadcastTx: jest.fn(),
  },
}));

jest.mock('@/lib/hive-workerbee/api', () => ({
  makeWorkerBeeApiCall: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/wax-helpers', () => ({
  createVoteOperation: jest.fn((data) => ({
    voter: data.voter,
    author: data.author,
    permlink: data.permlink,
    weight: Math.round(data.weight * 100),
  })),
  getVotingPowerWax: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/transaction-confirmation', () => ({
  waitForTransaction: jest.fn().mockResolvedValue({ confirmed: true, blockNum: 12345 }),
}));

import { aioha } from '@/lib/aioha/config';
import { makeWorkerBeeApiCall } from '@/lib/hive-workerbee/api';
import { getVotingPowerWax } from '@/lib/hive-workerbee/wax-helpers';

const mockAioha = aioha as jest.Mocked<{
  signAndBroadcastTx: jest.Mock;
}>;
const mockMakeWorkerBeeApiCall = makeWorkerBeeApiCall as jest.Mock;
const mockGetVotingPowerWax = getVotingPowerWax as jest.Mock;

describe('Voting Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // castVote Tests
  // ==========================================================================

  describe('castVote', () => {
    const voteData: VoteData = {
      voter: 'testvoter',
      author: 'testauthor',
      permlink: 'test-post',
      weight: 100,
    };

    it('successfully casts a vote', async () => {
      mockAioha.signAndBroadcastTx.mockResolvedValueOnce({
        id: 'tx-12345',
      });

      const result = await castVote(voteData);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx-12345');
      expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledWith(
        [['vote', expect.any(Object)]],
        'posting'
      );
    });

    it('returns error when aioha is not available', async () => {
      jest.resetModules();
      jest.doMock('@/lib/aioha/config', () => ({
        aioha: null,
      }));

      // Re-import to get the null aioha
      const { castVote: castVoteWithNullAioha } = await import('@/lib/hive-workerbee/voting');

      const result = await castVoteWithNullAioha(voteData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Aioha authentication is not available');

      // Restore
      jest.resetModules();
    });

    it('handles broadcast failure gracefully', async () => {
      mockAioha.signAndBroadcastTx.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await castVote(voteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('creates correct operation format', async () => {
      mockAioha.signAndBroadcastTx.mockResolvedValueOnce({ id: 'tx-1' });

      await castVote({
        voter: 'alice',
        author: 'bob',
        permlink: 'my-post',
        weight: 50,
      });

      expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledWith(
        [
          [
            'vote',
            expect.objectContaining({
              voter: 'alice',
              author: 'bob',
              permlink: 'my-post',
              weight: 5000, // 50% = 5000 basis points
            }),
          ],
        ],
        'posting'
      );
    });
  });

  // ==========================================================================
  // removeVote Tests
  // ==========================================================================

  describe('removeVote', () => {
    it('removes vote by casting with weight 0', async () => {
      mockAioha.signAndBroadcastTx.mockResolvedValueOnce({ id: 'tx-remove' });

      const result = await removeVote({
        voter: 'testvoter',
        author: 'testauthor',
        permlink: 'test-post',
      });

      expect(result.success).toBe(true);
      expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledWith(
        [['vote', expect.objectContaining({ weight: 0 })]],
        'posting'
      );
    });
  });

  // ==========================================================================
  // checkUserVote Tests
  // ==========================================================================

  describe('checkUserVote', () => {
    it('returns vote when user has voted', async () => {
      const mockPost = {
        author: 'testauthor',
        active_votes: [
          {
            voter: 'alice',
            weight: 10000,
            rshares: '1000000',
            percent: 100,
            reputation: '25',
            time: '2024-01-01T00:00:00',
          },
          {
            voter: 'bob',
            weight: 5000,
            rshares: '500000',
            percent: 50,
            reputation: '20',
            time: '2024-01-01T01:00:00',
          },
        ],
      };

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockPost);

      const result = await checkUserVote('testauthor', 'test-post', 'alice');

      expect(result).not.toBeNull();
      expect(result?.voter).toBe('alice');
      expect(result?.weight).toBe(10000);
    });

    it('returns null when user has not voted', async () => {
      const mockPost = {
        author: 'testauthor',
        active_votes: [
          {
            voter: 'bob',
            weight: 5000,
            rshares: '500000',
            percent: 50,
            reputation: '20',
            time: '2024-01-01T01:00:00',
          },
        ],
      };

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockPost);

      const result = await checkUserVote('testauthor', 'test-post', 'alice');

      expect(result).toBeNull();
    });

    it('returns null when post has no votes', async () => {
      const mockPost = { author: 'testauthor', active_votes: [] };
      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockPost);

      const result = await checkUserVote('testauthor', 'test-post', 'alice');

      expect(result).toBeNull();
    });

    it('returns null when API call fails', async () => {
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('API error'));

      const result = await checkUserVote('testauthor', 'test-post', 'alice');

      expect(result).toBeNull();
    });

    it('returns null when post is not found', async () => {
      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(null);

      const result = await checkUserVote('testauthor', 'test-post', 'alice');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getPostVotes Tests
  // ==========================================================================

  describe('getPostVotes', () => {
    it('returns all votes for a post', async () => {
      const mockPost = {
        active_votes: [
          { voter: 'alice', weight: 10000 },
          { voter: 'bob', weight: 5000 },
          { voter: 'charlie', weight: 2000 },
        ],
      };

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockPost);

      const result = await getPostVotes('testauthor', 'test-post');

      expect(result).toHaveLength(3);
      expect(result[0].voter).toBe('alice');
    });

    it('returns empty array when post has no votes', async () => {
      mockMakeWorkerBeeApiCall.mockResolvedValueOnce({ active_votes: [] });

      const result = await getPostVotes('testauthor', 'test-post');

      expect(result).toHaveLength(0);
    });

    it('returns empty array when API fails', async () => {
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('Network error'));

      const result = await getPostVotes('testauthor', 'test-post');

      expect(result).toHaveLength(0);
    });

    it('returns empty array when post not found', async () => {
      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(null);

      const result = await getPostVotes('testauthor', 'test-post');

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getUserVotingPower Tests
  // ==========================================================================

  describe('getUserVotingPower', () => {
    it('returns voting power using Wax helpers', async () => {
      mockGetVotingPowerWax.mockResolvedValueOnce(85.5);

      const result = await getUserVotingPower('testuser');

      expect(result).toBe(85.5);
    });

    it('falls back to API when Wax fails', async () => {
      mockGetVotingPowerWax.mockRejectedValueOnce(new Error('Wax error'));
      mockMakeWorkerBeeApiCall.mockResolvedValueOnce([{ voting_power: 9000 }]);

      const result = await getUserVotingPower('testuser');

      expect(result).toBe(90); // 9000/100 = 90%
    });

    it('returns 0 when both methods fail', async () => {
      mockGetVotingPowerWax.mockRejectedValueOnce(new Error('Wax error'));
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('API error'));

      const result = await getUserVotingPower('testuser');

      expect(result).toBe(0);
    });

    it('returns 0 when account not found', async () => {
      mockGetVotingPowerWax.mockRejectedValueOnce(new Error('Wax error'));
      mockMakeWorkerBeeApiCall.mockResolvedValueOnce([]);

      const result = await getUserVotingPower('testuser');

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // calculateOptimalVoteWeight Tests
  // ==========================================================================

  describe('calculateOptimalVoteWeight', () => {
    it('returns 100% for high voting power', async () => {
      mockGetVotingPowerWax.mockResolvedValueOnce(85);

      const result = await calculateOptimalVoteWeight('testuser');

      expect(result).toBe(100);
    });

    it('returns scaled weight based on voting power with recent vote', async () => {
      // Mock 50% voting power with a recent vote (no regeneration)
      mockGetVotingPowerWax.mockResolvedValueOnce(50);

      // Pass recent lastVoteTime to prevent regeneration boost
      const result = await calculateOptimalVoteWeight('testuser', new Date());

      // 50% is between 40-60, so returns 60
      expect(result).toBe(60);
    });

    it('returns low weight for low voting power with recent vote', async () => {
      mockGetVotingPowerWax.mockResolvedValueOnce(15);

      // Pass recent lastVoteTime to prevent regeneration boost
      const result = await calculateOptimalVoteWeight('testuser', new Date());

      // 15% is < 20, so returns 20
      expect(result).toBe(20);
    });

    it('returns default weight when voting power fetch fails', async () => {
      // When both Wax and fallback fail, getUserVotingPower returns 0
      // 0 + 20% regeneration = 20%, which is <= 20, so returns 20
      mockGetVotingPowerWax.mockRejectedValueOnce(new Error('Error'));
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('Error'));

      const result = await calculateOptimalVoteWeight('testuser');

      // With 0% voting power + 24hr regeneration (20%), returns 40 (since 20 > 20)
      // Actually: regeneratedPower = 0 + 20 = 20, which is not > 20, so returns 20
      expect(result).toBe(20);
    });
  });

  // ==========================================================================
  // getVoteStats Tests
  // ==========================================================================

  describe('getVoteStats', () => {
    it('calculates vote statistics correctly', async () => {
      const mockPost = {
        active_votes: [
          { voter: 'alice', weight: 10000, percent: 10000 },
          { voter: 'bob', weight: 5000, percent: 5000 },
          { voter: 'charlie', weight: -2000, percent: -2000 }, // downvote
        ],
        net_votes: 2,
        pending_payout_value: '1.234 HBD',
      };

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockPost);

      const result = await getVoteStats('testauthor', 'test-post');

      expect(result.totalVotes).toBe(3);
      expect(result.upvotes).toBe(2);
      expect(result.downvotes).toBe(1);
      expect(result.netVotes).toBe(2);
      expect(result.pendingPayout).toBe(1.234);
    });

    it('returns zero stats when post not found', async () => {
      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(null);

      const result = await getVoteStats('testauthor', 'test-post');

      expect(result.totalVotes).toBe(0);
      expect(result.upvotes).toBe(0);
      expect(result.downvotes).toBe(0);
    });

    it('returns zero stats on error', async () => {
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('Error'));

      const result = await getVoteStats('testauthor', 'test-post');

      expect(result.totalVotes).toBe(0);
    });
  });

  // ==========================================================================
  // getUserRecentVotes Tests
  // ==========================================================================

  describe('getUserRecentVotes', () => {
    it('returns recent votes from account history', async () => {
      const mockHistory = [
        [
          1,
          {
            op: ['vote', { voter: 'testuser', author: 'alice', permlink: 'post1', weight: 10000 }],
            timestamp: '2024-01-03T00:00:00',
          },
        ],
        [
          2,
          {
            op: ['vote', { voter: 'testuser', author: 'bob', permlink: 'post2', weight: 5000 }],
            timestamp: '2024-01-02T00:00:00',
          },
        ],
        [
          3,
          {
            op: ['transfer', { from: 'testuser', to: 'alice', amount: '1.000 HIVE' }],
            timestamp: '2024-01-01T00:00:00',
          },
        ], // Should be filtered
      ];

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockHistory);

      const result = await getUserRecentVotes('testuser', 10);

      expect(result).toHaveLength(2);
      expect(result[0].author).toBe('alice');
      expect(result[0].weight).toBe(100); // 10000/100 = 100%
    });

    it('returns empty array on error', async () => {
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('Error'));

      const result = await getUserRecentVotes('testuser');

      expect(result).toHaveLength(0);
    });

    it('filters out votes on user content (not by user)', async () => {
      const mockHistory = [
        [
          1,
          {
            op: ['vote', { voter: 'alice', author: 'testuser', permlink: 'post1', weight: 10000 }],
            timestamp: '2024-01-01T00:00:00',
          },
        ], // Vote ON testuser's content
        [
          2,
          {
            op: ['vote', { voter: 'testuser', author: 'bob', permlink: 'post2', weight: 5000 }],
            timestamp: '2024-01-01T01:00:00',
          },
        ], // Vote BY testuser
      ];

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockHistory);

      const result = await getUserRecentVotes('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('bob');
    });
  });

  // ==========================================================================
  // canUserVote Tests
  // ==========================================================================

  describe('canUserVote', () => {
    it('returns canVote true when voting power is sufficient', async () => {
      mockGetVotingPowerWax.mockResolvedValueOnce(50);

      const result = await canUserVote('testuser');

      expect(result.canVote).toBe(true);
      expect(result.votingPower).toBe(50);
    });

    it('returns canVote false when voting power is insufficient', async () => {
      mockGetVotingPowerWax.mockResolvedValueOnce(0.5);

      const result = await canUserVote('testuser');

      expect(result.canVote).toBe(false);
      expect(result.reason).toContain('Insufficient voting power');
    });

    it('returns insufficient voting power when fetch fails and returns 0', async () => {
      // When API fails, getUserVotingPower returns 0
      // 0% voting power is less than 1%, so returns insufficient
      mockGetVotingPowerWax.mockRejectedValueOnce(new Error('Error'));
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('Error'));

      const result = await canUserVote('testuser');

      expect(result.canVote).toBe(false);
      expect(result.votingPower).toBe(0);
      expect(result.reason).toContain('Insufficient voting power');
    });
  });

  // ==========================================================================
  // getHiveSignerVoteUrl Tests
  // ==========================================================================

  describe('getHiveSignerVoteUrl', () => {
    it('generates correct HiveSigner URL', () => {
      const voteData: VoteData = {
        voter: 'testvoter',
        author: 'testauthor',
        permlink: 'test-post',
        weight: 100,
      };

      const url = getHiveSignerVoteUrl(voteData);

      expect(url).toContain('https://hivesigner.com/sign/vote');
      expect(url).toContain('author=testauthor');
      expect(url).toContain('permlink=test-post');
      expect(url).toContain('voter=testvoter');
      expect(url).toContain('weight=10000'); // 100 * 100
    });
  });

  // ==========================================================================
  // batchVote Tests
  // ==========================================================================

  describe('batchVote', () => {
    it('broadcasts multiple votes in single transaction', async () => {
      mockAioha.signAndBroadcastTx.mockResolvedValueOnce({ id: 'batch-tx' });

      const votes: VoteData[] = [
        { voter: 'alice', author: 'bob', permlink: 'post1', weight: 100 },
        { voter: 'alice', author: 'charlie', permlink: 'post2', weight: 50 },
      ];

      const results = await batchVote(votes);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
      expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledTimes(1);
    });

    it('returns error for all votes when transaction fails', async () => {
      mockAioha.signAndBroadcastTx.mockRejectedValueOnce(new Error('Batch failed'));

      const votes: VoteData[] = [
        { voter: 'alice', author: 'bob', permlink: 'post1', weight: 100 },
        { voter: 'alice', author: 'charlie', permlink: 'post2', weight: 50 },
      ];

      const results = await batchVote(votes);

      expect(results.every((r) => !r.success)).toBe(true);
      expect(results[0].error).toBe('Batch failed');
    });
  });

  // ==========================================================================
  // getVoteHistory Tests
  // ==========================================================================

  describe('getVoteHistory', () => {
    it('returns sorted vote history', async () => {
      const mockPost = {
        active_votes: [
          { voter: 'alice', weight: 10000, time: '2024-01-01T00:00:00' },
          { voter: 'bob', weight: 5000, time: '2024-01-02T00:00:00' },
          { voter: 'charlie', weight: 2000, time: '2024-01-03T00:00:00' },
        ],
      };

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockPost);

      const result = await getVoteHistory('testauthor', 'test-post');

      expect(result).toHaveLength(3);
      // Should be sorted newest first
      expect(result[0].voter).toBe('charlie');
      expect(result[2].voter).toBe('alice');
    });

    it('respects limit parameter', async () => {
      const mockPost = {
        active_votes: [
          { voter: 'alice', weight: 10000, time: '2024-01-01T00:00:00' },
          { voter: 'bob', weight: 5000, time: '2024-01-02T00:00:00' },
          { voter: 'charlie', weight: 2000, time: '2024-01-03T00:00:00' },
        ],
      };

      mockMakeWorkerBeeApiCall.mockResolvedValueOnce(mockPost);

      const result = await getVoteHistory('testauthor', 'test-post', 2);

      expect(result).toHaveLength(2);
    });

    it('returns empty array on error', async () => {
      mockMakeWorkerBeeApiCall.mockRejectedValueOnce(new Error('Error'));

      const result = await getVoteHistory('testauthor', 'test-post');

      expect(result).toHaveLength(0);
    });
  });
});
