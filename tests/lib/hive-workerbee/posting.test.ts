/** @jest-environment node */

import {
  publishPost,
  publishComment,
  updatePost,
  deletePost,
  canUserPost,
  getEstimatedRCCost,
  validatePostData,
} from '@/lib/hive-workerbee/posting';
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
}));

// posting.ts imports these from './shared' (pure, no WASM)
jest.mock('@/lib/hive-workerbee/shared', () => {
  const actual = jest.requireActual('@/lib/hive-workerbee/shared');
  return {
    ...actual,
    createPostOperation: jest.fn((data: Record<string, unknown>) => ({
      parent_author: data.parentAuthor || '',
      parent_permlink: data.parentPermlink || 'sportsblock',
      author: data.author,
      permlink: `${String(data.title).toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      title: data.title,
      body: data.body,
      json_metadata: JSON.stringify({ app: 'sportsblock/1.0.0', tags: data.tags || [] }),
    })),
    createCommentOperation: jest.fn((data: Record<string, unknown>) => ({
      parent_author: data.parentAuthor,
      parent_permlink: data.parentPermlink,
      author: data.author,
      permlink: `re-${data.parentPermlink}-${Date.now()}`,
      title: '',
      body: data.body,
      json_metadata: JSON.stringify({ app: 'sportsblock/1.0.0' }),
    })),
    createCommentOptionsOperation: jest.fn((data: Record<string, unknown>) => ({
      author: data.author,
      permlink: data.permlink,
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [[0, { beneficiaries: [{ account: 'sportsblock', weight: 500 }] }]],
    })),
  };
});

// posting.ts imports checkResourceCreditsWax from './wax-helpers'
jest.mock('@/lib/hive-workerbee/wax-helpers', () => ({
  checkResourceCreditsWax: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/transaction-confirmation', () => ({
  waitForTransaction: jest.fn().mockResolvedValue({ confirmed: true, blockNum: 12345 }),
}));

import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import { checkResourceCreditsWax } from '@/lib/hive-workerbee/wax-helpers';

const mockBroadcastFn: jest.MockedFunction<BroadcastFn> = jest.fn();
const mockMakeHiveApiCall = makeHiveApiCall as jest.Mock;
const mockCheckResourceCreditsWax = checkResourceCreditsWax as jest.Mock;

describe('Posting Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: RC check passes (publishPost now enforces RC server-side)
    mockCheckResourceCreditsWax.mockResolvedValue({ canPost: true, rcPercentage: 80 });
  });

  // ==========================================================================
  // publishPost Tests
  // ==========================================================================

  describe('publishPost', () => {
    const validPostData: PostData = {
      title: 'Test Post Title',
      body: 'This is the post body content.',
      author: 'testauthor',
      tags: ['sports', 'test'],
    };

    it('successfully publishes a post', async () => {
      mockBroadcastFn.mockResolvedValueOnce({
        success: true,
        transactionId: 'tx-post-12345',
      });

      const result = await publishPost(validPostData, mockBroadcastFn);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx-post-12345');
      expect(result.author).toBe('testauthor');
      expect(result.permlink).toBeDefined();
      expect(result.url).toContain('hive.blog/@testauthor/');
    });

    it('includes comment_options for beneficiaries', async () => {
      mockBroadcastFn.mockResolvedValueOnce({
        success: true,
        transactionId: 'tx-1',
      });

      await publishPost(validPostData, mockBroadcastFn);

      // Should have two operations: comment and comment_options
      expect(mockBroadcastFn).toHaveBeenCalledWith(
        expect.arrayContaining([
          ['comment', expect.any(Object)],
          ['comment_options', expect.any(Object)],
        ]),
        'posting'
      );
    });

    it('handles broadcast failure gracefully', async () => {
      mockBroadcastFn.mockRejectedValueOnce(new Error('Insufficient resource credits'));

      const result = await publishPost(validPostData, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient resource credits');
    });

    it('returns validation error for missing title', async () => {
      const invalidPost = { ...validPostData, title: '' };

      const result = await publishPost(invalidPost, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title is required');
    });

    it('returns validation error for missing body', async () => {
      const invalidPost = { ...validPostData, body: '' };

      const result = await publishPost(invalidPost, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Body is required');
    });

    it('returns validation error for missing author', async () => {
      const invalidPost = { ...validPostData, author: '' };

      const result = await publishPost(invalidPost, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Author is required');
    });

    it('handles transaction error response', async () => {
      mockBroadcastFn.mockResolvedValueOnce({
        success: false,
        error: 'Account does not have sufficient RC',
      });

      const result = await publishPost(validPostData, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account does not have sufficient RC');
    });

    it('includes sub-community data when provided', async () => {
      mockBroadcastFn.mockResolvedValueOnce({
        success: true,
        transactionId: 'tx-1',
      });

      const postWithSubCommunity: PostData = {
        ...validPostData,
        subCommunity: {
          id: 'sub-123',
          slug: 'nba-discussion',
          name: 'NBA Discussion',
        },
      };

      await publishPost(postWithSubCommunity, mockBroadcastFn);

      expect(mockBroadcastFn).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // publishComment Tests
  // ==========================================================================

  describe('publishComment', () => {
    const commentData = {
      body: 'This is a comment.',
      author: 'commenter',
      parentAuthor: 'testauthor',
      parentPermlink: 'test-post',
    };

    it('successfully publishes a comment', async () => {
      mockBroadcastFn.mockResolvedValueOnce({
        success: true,
        transactionId: 'tx-comment-12345',
      });

      const result = await publishComment(commentData, mockBroadcastFn);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx-comment-12345');
      expect(result.author).toBe('commenter');
      expect(result.permlink).toContain('re-test-post');
    });

    it('handles broadcast failure', async () => {
      mockBroadcastFn.mockRejectedValueOnce(new Error('Network error'));

      const result = await publishComment(commentData, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('calls broadcastFn with correct operations', async () => {
      mockBroadcastFn.mockResolvedValueOnce({
        success: true,
        transactionId: 'custom-tx',
      });

      const result = await publishComment(commentData, mockBroadcastFn);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('custom-tx');
      expect(mockBroadcastFn).toHaveBeenCalledWith([['comment', expect.any(Object)]], 'posting');
    });
  });

  // ==========================================================================
  // updatePost Tests
  // ==========================================================================

  describe('updatePost', () => {
    const updateData = {
      author: 'testauthor',
      permlink: 'test-post',
      title: 'Updated Title',
      body: 'Updated body content.',
    };

    it('successfully updates a post', async () => {
      const mockExistingPost = {
        created: new Date().toISOString(),
        parent_author: '',
        parent_permlink: 'sportsblock',
        title: 'Original Title',
        body: 'Original body',
        json_metadata: '{}',
        max_accepted_payout: '1000000.000 HBD',
        percent_hbd: 10000,
        allow_votes: true,
        allow_curation_rewards: true,
        extensions: [],
      };

      mockMakeHiveApiCall.mockResolvedValueOnce(mockExistingPost);
      mockBroadcastFn.mockResolvedValueOnce({ success: true, transactionId: 'update-tx' });

      const result = await updatePost(updateData, mockBroadcastFn);

      expect(result.success).toBe(true);
      expect(result.author).toBe('testauthor');
      expect(result.permlink).toBe('test-post');
    });

    it('returns error when post not found', async () => {
      mockMakeHiveApiCall.mockResolvedValueOnce(null);

      const result = await updatePost(updateData, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Post not found');
    });

    it('returns error when post is older than 7 days', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      mockMakeHiveApiCall.mockResolvedValueOnce({
        created: eightDaysAgo.toISOString(),
      });

      const result = await updatePost(updateData, mockBroadcastFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Post cannot be updated after 7 days');
    });

    it('merges existing and new metadata', async () => {
      const mockExistingPost = {
        created: new Date().toISOString(),
        parent_author: '',
        parent_permlink: 'sportsblock',
        json_metadata: JSON.stringify({ tags: ['existing'], customField: 'value' }),
        max_accepted_payout: '1000000.000 HBD',
        percent_hbd: 10000,
        allow_votes: true,
        allow_curation_rewards: true,
        extensions: [],
        title: 'Test',
        body: 'Test body',
      };

      mockMakeHiveApiCall.mockResolvedValueOnce(mockExistingPost);
      mockBroadcastFn.mockResolvedValueOnce({ success: true, transactionId: 'merge-tx' });

      await updatePost(
        {
          ...updateData,
          jsonMetadata: JSON.stringify({ newField: 'newValue' }),
        },
        mockBroadcastFn
      );

      // The update should preserve existing metadata
      expect(mockMakeHiveApiCall).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // deletePost Tests
  // ==========================================================================

  describe('deletePost', () => {
    it('deletes post by setting body to empty', async () => {
      const mockExistingPost = {
        created: new Date().toISOString(),
        parent_author: '',
        parent_permlink: 'sportsblock',
        title: 'Test',
        body: 'Test body',
        json_metadata: '{}',
        max_accepted_payout: '1000000.000 HBD',
        percent_hbd: 10000,
        allow_votes: true,
        allow_curation_rewards: true,
        extensions: [],
      };

      mockMakeHiveApiCall.mockResolvedValueOnce(mockExistingPost);
      mockBroadcastFn.mockResolvedValueOnce({ success: true, transactionId: 'delete-tx' });

      const result = await deletePost(
        {
          author: 'testauthor',
          permlink: 'test-post',
        },
        mockBroadcastFn
      );

      expect(result.success).toBe(true);
    });

    it('returns error when post cannot be deleted', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      mockMakeHiveApiCall.mockResolvedValueOnce({
        created: eightDaysAgo.toISOString(),
      });

      const result = await deletePost(
        {
          author: 'testauthor',
          permlink: 'test-post',
        },
        mockBroadcastFn
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('7 days');
    });
  });

  // ==========================================================================
  // canUserPost Tests
  // ==========================================================================

  describe('canUserPost', () => {
    it('returns true when user has sufficient RC', async () => {
      mockCheckResourceCreditsWax.mockResolvedValueOnce({
        canPost: true,
        rcPercentage: 85.5,
      });

      const result = await canUserPost('testuser');

      expect(result.canPost).toBe(true);
      expect(result.rcPercentage).toBe(85.5);
    });

    it('returns false when user has insufficient RC', async () => {
      mockCheckResourceCreditsWax.mockResolvedValueOnce({
        canPost: false,
        rcPercentage: 5,
        message: 'Insufficient Resource Credits',
      });

      const result = await canUserPost('testuser');

      expect(result.canPost).toBe(false);
      expect(result.rcPercentage).toBe(5);
      expect(result.message).toContain('Insufficient');
    });

    it('falls back to direct API when Wax fails', async () => {
      mockCheckResourceCreditsWax.mockRejectedValueOnce(new Error('Wax error'));
      mockMakeHiveApiCall.mockResolvedValueOnce({
        rc_accounts: [
          {
            account: 'testuser',
            rc_manabar: {
              current_mana: '900000000000000',
              last_update_time: Math.floor(Date.now() / 1000) - 1000,
            },
            max_rc: '1000000000000000',
          },
        ],
      });

      const result = await canUserPost('testuser');

      expect(result.canPost).toBe(true);
    });

    it('returns error on complete failure', async () => {
      mockCheckResourceCreditsWax.mockRejectedValueOnce(new Error('Wax error'));
      mockMakeHiveApiCall.mockRejectedValueOnce(new Error('API error'));

      const result = await canUserPost('testuser');

      expect(result.canPost).toBe(false);
      expect(result.message).toContain('error');
    });
  });

  // ==========================================================================
  // getEstimatedRCCost Tests
  // ==========================================================================

  describe('getEstimatedRCCost', () => {
    it('returns minimum of 1000 for short posts', () => {
      const cost = getEstimatedRCCost(100);
      expect(cost).toBe(1000);
    });

    it('scales with body length', () => {
      const cost = getEstimatedRCCost(10000);
      expect(cost).toBeGreaterThan(1000);
      expect(cost).toBe(12000); // 10000 * 1.2
    });
  });

  // ==========================================================================
  // validatePostData Tests
  // ==========================================================================

  describe('validatePostData', () => {
    const validPost: PostData = {
      title: 'Valid Title',
      body: 'Valid body content.',
      author: 'testauthor',
      tags: ['sports'],
    };

    it('returns valid for correct post data', () => {
      const result = validatePostData(validPost);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for empty title', () => {
      const result = validatePostData({ ...validPost, title: '' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('returns error for whitespace-only title', () => {
      const result = validatePostData({ ...validPost, title: '   ' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('returns error for empty body', () => {
      const result = validatePostData({ ...validPost, body: '' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Body is required');
    });

    it('returns error for whitespace-only body', () => {
      const result = validatePostData({ ...validPost, body: '  \n\t  ' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Body is required');
    });

    it('returns error for empty author', () => {
      const result = validatePostData({ ...validPost, author: '' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Author is required');
    });

    it('returns error for title exceeding 255 characters', () => {
      const longTitle = 'a'.repeat(256);
      const result = validatePostData({ ...validPost, title: longTitle });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is too long (max 255 characters)');
    });

    it('returns error for body exceeding 65535 characters', () => {
      const longBody = 'a'.repeat(65536);
      const result = validatePostData({ ...validPost, body: longBody });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Body is too long (max 65535 characters)');
    });

    it('returns error for too many tags', () => {
      const result = validatePostData({
        ...validPost,
        tags: ['a', 'b', 'c', 'd', 'e', 'f'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many tags (max 5)');
    });

    it('returns multiple errors when multiple validations fail', () => {
      const result = validatePostData({
        title: '',
        body: '',
        author: '',
        tags: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('accepts valid edge cases', () => {
      // Exactly 255 character title
      const result255 = validatePostData({
        ...validPost,
        title: 'a'.repeat(255),
      });
      expect(result255.isValid).toBe(true);

      // Exactly 5 tags
      const result5Tags = validatePostData({
        ...validPost,
        tags: ['a', 'b', 'c', 'd', 'e'],
      });
      expect(result5Tags.isValid).toBe(true);
    });
  });
});
