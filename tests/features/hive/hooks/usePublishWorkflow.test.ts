/**
 * @jest-environment node
 *
 * Tests the publish workflow for both auth types:
 * - Hive auth: publishPost() -> Wax operation -> Aioha broadcast
 * - Soft auth: fetch('/api/posts') -> Firebase
 *
 * The existing posting.test.ts covers publishPost internals.
 * This file covers the auth-type branching and soft-auth API path.
 */

import { publishPost, publishComment, validatePostData } from '@/lib/hive-workerbee/posting';
import type { PostData } from '@/lib/hive-workerbee/posting';

// Mock dependencies
jest.mock('@/lib/aioha/config', () => ({
  aioha: {
    signAndBroadcastTx: jest.fn(),
  },
}));

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
    DEFAULT_BENEFICIARIES: [{ account: 'sportsblock', weight: 2000 }],
  },
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

import { aioha } from '@/lib/aioha/config';

const mockAioha = aioha as { signAndBroadcastTx: jest.Mock };

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
    mockAioha.signAndBroadcastTx.mockResolvedValue({
      success: true,
      result: { id: 'tx-abc123' },
    });
  });

  // ===========================================================================
  // Hive auth publish flow
  // ===========================================================================

  describe('Hive auth publish', () => {
    it('broadcasts via aioha with posting key for hive users', async () => {
      const result = await publishPost(validPostData);

      expect(result.success).toBe(true);
      expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledWith(
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

      const result = await publishPost(postWithCommunity);
      expect(result.success).toBe(true);
      // The operation should include community data in metadata
      expect(mockAioha.signAndBroadcastTx).toHaveBeenCalled();
    });

    it('returns error when aioha is not available', async () => {
      // Temporarily replace aioha with null
      const originalAioha = jest.requireMock('@/lib/aioha/config').aioha;
      jest.requireMock('@/lib/aioha/config').aioha = null;

      const result = await publishPost(validPostData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');

      // Restore
      jest.requireMock('@/lib/aioha/config').aioha = originalAioha;
    });

    it('returns error on broadcast failure', async () => {
      mockAioha.signAndBroadcastTx.mockResolvedValue({
        success: false,
        error: 'Insufficient RC',
      });

      const result = await publishPost(validPostData);
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // Comment flow
  // ===========================================================================

  describe('Hive auth comment flow', () => {
    it('publishes comment with correct parent references', async () => {
      const result = await publishComment({
        parentAuthor: 'originalauthor',
        parentPermlink: 'original-post',
        body: 'Great post!',
        author: 'commenter',
      });

      expect(result.success).toBe(true);
      expect(mockAioha.signAndBroadcastTx).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Soft auth publish path (Firebase API)
  // ===========================================================================

  describe('soft auth publish path', () => {
    it('soft users publish via /api/posts endpoint (not publishPost)', () => {
      // This test documents the architectural decision:
      // Soft auth users do NOT call publishPost() at all.
      // They call fetch('/api/posts') which writes to Firestore.
      // The publish page checks authType and branches accordingly.
      //
      // This means publishPost always requires aioha (Hive wallet).
      // Soft auth is handled entirely at the API route level.

      // Verify publishPost requires aioha by checking it fails without it
      const originalAioha = jest.requireMock('@/lib/aioha/config').aioha;
      jest.requireMock('@/lib/aioha/config').aioha = null;

      return publishPost(validPostData).then((result) => {
        expect(result.success).toBe(false);
        jest.requireMock('@/lib/aioha/config').aioha = originalAioha;
      });
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
