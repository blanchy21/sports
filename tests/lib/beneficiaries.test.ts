/**
 * Tests for the beneficiary system
 * Verifies that posts created via Sportsblock include the 5% platform beneficiary
 */

// Mock the WorkerBee client before importing
jest.mock('@/lib/hive-workerbee/client', () => ({
  SPORTS_ARENA_CONFIG: {
    APP_NAME: 'sportsblock',
    APP_VERSION: '1.0.0',
    COMMUNITY_ID: 'hive-115814',
    COMMUNITY_NAME: 'sportsblock',
    TAGS: ['sportsblock', 'hive-115814'],
    DEFAULT_BENEFICIARIES: [
      {
        account: 'sportsblock',
        weight: 500, // 5% to platform (per MEDALS whitepaper v4)
      },
    ],
  },
  getWorkerBeeClient: jest.fn(),
  initializeWorkerBeeClient: jest.fn(),
  getWaxClient: jest.fn(),
}));

// Mock the logger
jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import { SPORTS_ARENA_CONFIG } from '@/lib/hive-workerbee/client';
import {
  createPostOperation,
  createCommentOptionsOperation,
} from '@/lib/hive-workerbee/wax-helpers';

describe('Beneficiary System', () => {
  describe('SPORTS_ARENA_CONFIG', () => {
    it('should have 5% beneficiary weight for sportsblock', () => {
      const beneficiaries = SPORTS_ARENA_CONFIG.DEFAULT_BENEFICIARIES;
      expect(beneficiaries).toHaveLength(1);
      expect(beneficiaries[0].account).toBe('sportsblock');
      expect(beneficiaries[0].weight).toBe(500); // 5% = 500 basis points
    });
  });

  describe('createPostOperation', () => {
    it('should create a valid post operation without beneficiaries in extensions', () => {
      const operation = createPostOperation({
        author: 'testuser',
        title: 'Test Post',
        body: 'This is a test post body',
        tags: ['test'],
      });

      expect(operation.author).toBe('testuser');
      expect(operation.title).toBe('Test Post');
      expect(operation.body).toBe('This is a test post body');
      expect(operation.extensions).toEqual([]); // Beneficiaries handled by comment_options
    });
  });

  describe('createCommentOptionsOperation', () => {
    it('should create comment_options with default beneficiaries', () => {
      const options = createCommentOptionsOperation({
        author: 'testuser',
        permlink: 'test-post-123',
      });

      expect(options.author).toBe('testuser');
      expect(options.permlink).toBe('test-post-123');
      expect(options.extensions).toHaveLength(1);
      expect(options.extensions[0][0]).toBe(0);
      expect(options.extensions[0][1].beneficiaries).toHaveLength(1);
      expect(options.extensions[0][1].beneficiaries[0].account).toBe('sportsblock');
      expect(options.extensions[0][1].beneficiaries[0].weight).toBe(500);
    });

    it('should sort beneficiaries alphabetically', () => {
      const options = createCommentOptionsOperation({
        author: 'testuser',
        permlink: 'test-post-123',
        beneficiaries: [
          { account: 'zebra', weight: 500 },
          { account: 'apple', weight: 500 },
          { account: 'mango', weight: 500 },
        ],
      });

      const beneficiaries = options.extensions[0][1].beneficiaries;
      expect(beneficiaries[0].account).toBe('apple');
      expect(beneficiaries[1].account).toBe('mango');
      expect(beneficiaries[2].account).toBe('zebra');
    });

    it('should allow custom beneficiaries', () => {
      const options = createCommentOptionsOperation({
        author: 'testuser',
        permlink: 'test-post-123',
        beneficiaries: [
          { account: 'sportsblock', weight: 500 },
          { account: 'charity', weight: 500 },
        ],
      });

      const beneficiaries = options.extensions[0][1].beneficiaries;
      expect(beneficiaries).toHaveLength(2);
      // Should be sorted alphabetically
      expect(beneficiaries[0].account).toBe('charity');
      expect(beneficiaries[1].account).toBe('sportsblock');
    });

    it('should set default max_accepted_payout', () => {
      const options = createCommentOptionsOperation({
        author: 'testuser',
        permlink: 'test-post-123',
      });

      expect(options.max_accepted_payout).toBe('1000000.000 HBD');
    });

    it('should set default percent_hbd to 100%', () => {
      const options = createCommentOptionsOperation({
        author: 'testuser',
        permlink: 'test-post-123',
      });

      expect(options.percent_hbd).toBe(10000); // 10000 = 100%
    });

    it('should allow votes and curation rewards by default', () => {
      const options = createCommentOptionsOperation({
        author: 'testuser',
        permlink: 'test-post-123',
      });

      expect(options.allow_votes).toBe(true);
      expect(options.allow_curation_rewards).toBe(true);
    });
  });
});
