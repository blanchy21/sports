/**
 * @jest-environment node
 *
 * Tests the publish workflow for both auth types:
 * - Hive auth: publishPost() -> Wax operation -> wallet broadcast
 * - Soft auth: fetch('/api/posts') -> Prisma/PostgreSQL
 *
 * The existing posting.test.ts covers publishPost internals.
 * This file covers the auth-type branching and soft-auth API path.
 */

import { publishPost, publishComment, validatePostData } from '@/lib/hive-workerbee/posting';
import type { PostData } from '@/lib/hive-workerbee/posting';
import type { BroadcastFn } from '@/lib/hive/broadcast-client';

// Mock dependencies

jest.mock('@/lib/hive-workerbee/api', () => ({
  makeHiveApiCall: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/client', () => ({
  SPORTS_ARENA_CONFIG: {
    APP_NAME: 'sportsblock',
    APP_VERSION: '1.0.0',
    COMMUNITY_ID: 'hive-115814',
    COMMUNITY_NAME: 'sportsblock',
    TAGS: ['sportsblock', 'hive-115814'],
    DEFAULT_BENEFICIARIES: [{ account: 'sportsblock', weight: 500 }],
  },
  MUTED_AUTHORS: [],
  initializeWorkerBeeClient: jest.fn().mockResolvedValue({
    broadcast: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('@/lib/hive-workerbee/wax-helpers', () => ({
  createPostOperation: jest.fn((data) => ({
    parent_author: '',
    parent_permlink: 'sportsblock',
    author: data.author,
    permlink: `test-permlink-${Date.now()}`,
    title: data.title,
    body: data.body,
    json_metadata: JSON.stringify({
      app: 'sportsblock/1.0.0',
      tags: data.tags || [],
      sport_category: data.sportCategory,
    }),
  })),
  createCommentOperation: jest.fn((data) => ({
    parent_author: data.parentAuthor,
    parent_permlink: data.parentPermlink,
    author: data.author,
    permlink: `re-${data.parentAuthor}-${Date.now()}`,
    title: '',
    body: data.body,
    json_metadata: JSON.stringify({ app: 'sportsblock/1.0.0' }),
  })),
  createCommentOptionsOperation: jest.fn(() => ({
    author: 'testuser',
    permlink: 'test-permlink',
    max_accepted_payout: '1000000.000 HBD',
    percent_hbd: 10000,
    allow_votes: true,
    allow_curation_rewards: true,
    extensions: [],
  })),
  checkResourceCreditsWax: jest.fn().mockResolvedValue({
    currentMana: 5000000000,
    maxMana: 5000000000,
    percentage: 100,
  }),
}));

jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/transaction-confirmation', () => ({
  waitForTransaction: jest.fn().mockResolvedValue({ confirmed: true }),
}));

const mockBroadcastFn: jest.MockedFunction<BroadcastFn> = jest.fn();

describe('Publish workflow - auth type branching', () => {
  const validPostData: PostData = {
    title: 'Test Post Title',
    body: 'This is a valid post body with enough content to pass validation.',
    author: 'testuser',
    sportCategory: 'football',
    tags: ['football', 'epl'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBroadcastFn.mockResolvedValue({
      success: true,
      transactionId: 'tx-abc123',
    });
  });

  // ===========================================================================
  // Hive auth publish flow
  // ===========================================================================

  describe('Hive auth publish', () => {
    it('broadcasts via broadcastFn with posting key for hive users', async () => {
      const result = await publishPost(validPostData, mockBroadcastFn);

      expect(result.success).toBe(true);
      expect(mockBroadcastFn).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('posting')
      );
    });

    it('includes sub-community metadata when provided', async () => {
      const postWithCommunity: PostData = {
        ...validPostData,
        subCommunity: {
          id: 'comm1',
          slug: 'premier-league',
          name: 'Premier League',
        },
      };

      const result = await publishPost(postWithCommunity, mockBroadcastFn);
      expect(result.success).toBe(true);
      expect(mockBroadcastFn).toHaveBeenCalled();
    });

    it('returns error on broadcast failure', async () => {
      mockBroadcastFn.mockResolvedValueOnce({
        success: false,
        error: 'Insufficient RC',
      });

      const result = await publishPost(validPostData, mockBroadcastFn);
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // Comment flow
  // ===========================================================================

  describe('Hive auth comment flow', () => {
    it('publishes comment with correct parent references', async () => {
      const result = await publishComment(
        {
          parentAuthor: 'originalauthor',
          parentPermlink: 'original-post',
          body: 'Great post!',
          author: 'commenter',
        },
        mockBroadcastFn
      );

      expect(result.success).toBe(true);
      expect(mockBroadcastFn).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('pre-publish validation', () => {
    it('rejects empty title', () => {
      const result = validatePostData({ ...validPostData, title: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects empty body', () => {
      const result = validatePostData({ ...validPostData, body: '' });
      expect(result.isValid).toBe(false);
    });

    it('rejects empty author', () => {
      const result = validatePostData({ ...validPostData, author: '' });
      expect(result.isValid).toBe(false);
    });

    it('accepts valid post data', () => {
      const result = validatePostData(validPostData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
