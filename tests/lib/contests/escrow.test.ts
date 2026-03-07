import {
  buildEntryFeeOp,
  buildPrizePayoutOps,
  buildPlatformFeeOp,
  buildCreatorFeeOp,
  buildRefundOps,
  buildEntryFeeBurnOp,
  buildFixedPrizePayoutOps,
} from '@/lib/contests/escrow';
import { CONTEST_CONFIG } from '@/lib/contests/constants';

function parseJson(op: { json: string }) {
  return JSON.parse(op.json);
}

describe('Contest Escrow Operations', () => {
  describe('buildEntryFeeOp', () => {
    it('builds transfer from user to escrow', () => {
      const op = buildEntryFeeOp('alice', 100, 'contest-1');
      const payload = parseJson(op);
      expect(payload.contractPayload.to).toBe(CONTEST_CONFIG.ESCROW_ACCOUNT);
      expect(payload.contractPayload.memo).toContain('contest-entry|contest-1');
      expect(op.required_auths).toContain('alice');
    });
  });

  describe('buildPlatformFeeOp', () => {
    it('burns platform fee to null account', () => {
      const op = buildPlatformFeeOp(50, 'contest-1');
      const payload = parseJson(op);
      expect(payload.contractPayload.to).toBe('null');
      expect(payload.contractPayload.memo).toContain('contest-platform-fee-burn');
      expect(op.required_auths).toContain(CONTEST_CONFIG.ESCROW_ACCOUNT);
    });
  });

  describe('buildCreatorFeeOp', () => {
    it('transfers creator fee from escrow to creator', () => {
      const op = buildCreatorFeeOp('creator1', 50, 'contest-1');
      const payload = parseJson(op);
      expect(payload.contractPayload.to).toBe('creator1');
      expect(op.required_auths).toContain(CONTEST_CONFIG.ESCROW_ACCOUNT);
    });
  });

  describe('buildPrizePayoutOps', () => {
    it('builds payout ops from escrow to winners', () => {
      const ops = buildPrizePayoutOps([
        { username: 'alice', amount: 300, contestId: 'c1', placement: 1 },
        { username: 'bob', amount: 200, contestId: 'c1', placement: 2 },
      ]);
      expect(ops).toHaveLength(2);
      expect(parseJson(ops[0]).contractPayload.to).toBe('alice');
      expect(parseJson(ops[1]).contractPayload.to).toBe('bob');
      expect(ops[0].required_auths).toContain(CONTEST_CONFIG.ESCROW_ACCOUNT);
    });
  });

  describe('buildEntryFeeBurnOp', () => {
    it('burns entry fees from escrow to null', () => {
      const op = buildEntryFeeBurnOp(500, 'contest-1');
      const payload = parseJson(op);
      expect(payload.contractPayload.to).toBe('null');
      expect(payload.contractPayload.memo).toContain('contest-entry-fee-burn');
      expect(op.required_auths).toContain(CONTEST_CONFIG.ESCROW_ACCOUNT);
    });
  });

  describe('buildFixedPrizePayoutOps', () => {
    it('builds payout ops from sportsblock to winners', () => {
      const ops = buildFixedPrizePayoutOps([
        { username: 'alice', amount: 300, contestId: 'c1', placement: 1 },
        { username: 'bob', amount: 125, contestId: 'c1', placement: 2 },
      ]);
      expect(ops).toHaveLength(2);
      expect(parseJson(ops[0]).contractPayload.to).toBe('alice');
      expect(parseJson(ops[1]).contractPayload.to).toBe('bob');
      // Fixed prizes come from sportsblock, not escrow
      expect(ops[0].required_auths).toContain(CONTEST_CONFIG.PLATFORM_ACCOUNT);
    });
  });

  describe('buildRefundOps', () => {
    it('builds refund ops from escrow to users', () => {
      const ops = buildRefundOps([{ username: 'alice', amount: 100, contestId: 'c1' }]);
      expect(ops).toHaveLength(1);
      expect(parseJson(ops[0]).contractPayload.to).toBe('alice');
      expect(ops[0].required_auths).toContain(CONTEST_CONFIG.ESCROW_ACCOUNT);
    });
  });
});
