/**
 * Hive Engine Operations Tests
 *
 * Tests for building Hive Engine custom_json operations.
 */

import {
  buildTransferOp,
  buildTransferOpFromAmount,
  buildStakeOp,
  buildUnstakeOp,
  buildDelegateOp,
  buildCancelUnstakeOp,
  buildBatchTransferOps,
  buildCuratorRewardOp,
  validateOperation,
  parseOperation,
  CONTENT_REWARD_AMOUNTS,
} from '@/lib/hive-engine/operations';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';

describe('Hive Engine Operations', () => {
  describe('buildTransferOp', () => {
    it('should build a valid transfer operation', () => {
      const op = buildTransferOp('alice', 'bob', '100.000', 'MEDALS', 'Test memo');

      expect(op.id).toBe('ssc-mainnet-hive');
      expect(op.required_auths).toEqual(['alice']);
      expect(op.required_posting_auths).toEqual([]);

      const payload = JSON.parse(op.json);
      expect(payload.contractName).toBe('tokens');
      expect(payload.contractAction).toBe('transfer');
      expect(payload.contractPayload.symbol).toBe('MEDALS');
      expect(payload.contractPayload.to).toBe('bob');
      expect(payload.contractPayload.quantity).toBe('100.000');
      expect(payload.contractPayload.memo).toBe('Test memo');
    });

    it('should build transfer without memo', () => {
      const op = buildTransferOp('alice', 'bob', '50.000');

      const payload = JSON.parse(op.json);
      expect(payload.contractPayload.memo).toBeUndefined();
    });

    it('should use default symbol', () => {
      const op = buildTransferOp('alice', 'bob', '50.000');

      const payload = JSON.parse(op.json);
      expect(payload.contractPayload.symbol).toBe(MEDALS_CONFIG.SYMBOL);
    });

    it('should throw on invalid account name', () => {
      expect(() => buildTransferOp('invalid_name', 'bob', '100.000')).toThrow();
      expect(() => buildTransferOp('alice', 'INVALID', '100.000')).toThrow();
    });

    it('should throw on invalid quantity', () => {
      expect(() => buildTransferOp('alice', 'bob', '0')).toThrow();
      expect(() => buildTransferOp('alice', 'bob', '-100')).toThrow();
      expect(() => buildTransferOp('alice', 'bob', 'abc')).toThrow();
    });
  });

  describe('buildTransferOpFromAmount', () => {
    it('should format amount correctly (6 decimals for MEDALS)', () => {
      const op = buildTransferOpFromAmount('alice', 'bob', 100);

      const payload = JSON.parse(op.json);
      expect(payload.contractPayload.quantity).toBe('100.000000');
    });

    it('should handle decimal amounts', () => {
      const op = buildTransferOpFromAmount('alice', 'bob', 99.999);

      const payload = JSON.parse(op.json);
      expect(payload.contractPayload.quantity).toBe('99.999000');
    });
  });

  describe('buildStakeOp', () => {
    it('should build a stake to self operation', () => {
      const op = buildStakeOp('alice', '100.000');

      const payload = JSON.parse(op.json);
      expect(payload.contractAction).toBe('stake');
      expect(payload.contractPayload.to).toBe('alice');
      expect(payload.contractPayload.quantity).toBe('100.000');
    });

    it('should build a stake to another account', () => {
      const op = buildStakeOp('alice', '100.000', 'bob');

      const payload = JSON.parse(op.json);
      expect(payload.contractPayload.to).toBe('bob');
    });
  });

  describe('buildUnstakeOp', () => {
    it('should build an unstake operation', () => {
      const op = buildUnstakeOp('alice', '50.000');

      expect(op.required_auths).toEqual(['alice']);

      const payload = JSON.parse(op.json);
      expect(payload.contractAction).toBe('unstake');
      expect(payload.contractPayload.quantity).toBe('50.000');
    });
  });

  describe('buildDelegateOp', () => {
    it('should build a delegate operation', () => {
      const op = buildDelegateOp('alice', 'bob', '100.000');

      const payload = JSON.parse(op.json);
      expect(payload.contractAction).toBe('delegate');
      expect(payload.contractPayload.to).toBe('bob');
      expect(payload.contractPayload.quantity).toBe('100.000');
    });

    it('should throw when delegating to self', () => {
      expect(() => buildDelegateOp('alice', 'alice', '100.000')).toThrow(
        'Cannot delegate to yourself'
      );
    });
  });

  describe('buildCancelUnstakeOp', () => {
    it('should build a cancel unstake operation', () => {
      const op = buildCancelUnstakeOp('alice', 'tx123456');

      const payload = JSON.parse(op.json);
      expect(payload.contractAction).toBe('cancelUnstake');
      expect(payload.contractPayload.txID).toBe('tx123456');
    });

    it('should throw on invalid txId', () => {
      expect(() => buildCancelUnstakeOp('alice', '')).toThrow('Invalid transaction ID');
    });
  });

  describe('buildBatchTransferOps', () => {
    it('should build multiple transfer operations', () => {
      const transfers = [
        { to: 'bob', amount: 100 },
        { to: 'carol', amount: 200, memo: 'Reward' },
        { to: 'dave', amount: 50 },
      ];

      const ops = buildBatchTransferOps('alice', transfers);

      expect(ops).toHaveLength(3);

      const payloads = ops.map((op) => JSON.parse(op.json));
      expect(payloads[0].contractPayload.to).toBe('bob');
      expect(payloads[0].contractPayload.quantity).toBe('100.000000');
      expect(payloads[1].contractPayload.to).toBe('carol');
      expect(payloads[1].contractPayload.memo).toBe('Reward');
      expect(payloads[2].contractPayload.to).toBe('dave');
    });
  });

  describe('buildCuratorRewardOp', () => {
    it('should build curator reward operation', () => {
      const op = buildCuratorRewardOp('curator1', 'author1', 'my-post');

      // MEDALS_CONFIG.ACCOUNTS.REWARDS = 'sb.rewards'
      expect(op.required_auths).toEqual(['sb.rewards']);

      const payload = JSON.parse(op.json);
      expect(payload.contractPayload.to).toBe('author1');
      expect(payload.contractPayload.quantity).toBe('100.000000'); // Default Y1-3 amount
      expect(payload.contractPayload.memo).toContain('Curator reward');
      expect(payload.contractPayload.memo).toContain('@author1/my-post');
    });

    it('should accept custom reward amount', () => {
      const op = buildCuratorRewardOp('curator1', 'author1', 'my-post', 150);

      const payload = JSON.parse(op.json);
      expect(payload.contractPayload.quantity).toBe('150.000000');
    });
  });

  describe('CONTENT_REWARD_AMOUNTS', () => {
    it('should have correct reward amounts', () => {
      expect(CONTENT_REWARD_AMOUNTS.most_external_views).toBe(5000);
      expect(CONTENT_REWARD_AMOUNTS.most_viewed_post).toBe(3000);
      expect(CONTENT_REWARD_AMOUNTS.most_comments).toBe(3000);
      expect(CONTENT_REWARD_AMOUNTS.most_engaged_post).toBe(2000);
      expect(CONTENT_REWARD_AMOUNTS.post_of_week).toBe(2000);
      expect(CONTENT_REWARD_AMOUNTS.best_newcomer).toBe(1000);
    });
  });

  describe('validateOperation', () => {
    it('should validate correct operations', () => {
      const op = buildTransferOp('alice', 'bob', '100.000');
      const result = validateOperation(op);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid operation ID', () => {
      const op = {
        id: 'invalid-id' as 'ssc-mainnet-hive',
        required_auths: ['alice'],
        required_posting_auths: [],
        json: '{}',
      };

      const result = validateOperation(op);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid operation ID');
    });

    it('should reject operations with no signing accounts', () => {
      const op = {
        id: 'ssc-mainnet-hive' as const,
        required_auths: [],
        required_posting_auths: [],
        json: '{}',
      };

      const result = validateOperation(op);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No signing accounts specified');
    });

    it('should reject invalid JSON', () => {
      const op = {
        id: 'ssc-mainnet-hive' as const,
        required_auths: ['alice'],
        required_posting_auths: [],
        json: 'not valid json',
      };

      const result = validateOperation(op);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid JSON payload');
    });
  });

  describe('parseOperation', () => {
    it('should parse valid operations', () => {
      const op = buildTransferOp('alice', 'bob', '100.000', 'MEDALS', 'Test');
      const parsed = parseOperation(op);

      expect(parsed).not.toBeNull();
      expect(parsed?.contract).toBe('tokens');
      expect(parsed?.action).toBe('transfer');
      expect(parsed?.signer).toBe('alice');
      expect(parsed?.payload.to).toBe('bob');
    });

    it('should return null for invalid operations', () => {
      const op = {
        id: 'ssc-mainnet-hive' as const,
        required_auths: ['alice'],
        required_posting_auths: [],
        json: 'invalid json',
      };

      const parsed = parseOperation(op);
      expect(parsed).toBeNull();
    });
  });
});
