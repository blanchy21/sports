import { FakeDecimal } from '../../__mocks__/prisma-client';

// Mock prisma
const mockContestUpdate = jest.fn().mockResolvedValue({});
const mockEntryUpdate = jest.fn().mockResolvedValue({});
const mockEntryFindMany = jest.fn();
const mockContestFindUnique = jest.fn();

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    contest: {
      findUnique: (...args: unknown[]) => mockContestFindUnique(...args),
      update: (...args: unknown[]) => mockContestUpdate(...args),
    },
    contestEntry: {
      findMany: (...args: unknown[]) => mockEntryFindMany(...args),
      update: (...args: unknown[]) => mockEntryUpdate(...args),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { calculateSettlement } from '@/lib/contests/settlement';
import { PRIZE_MODELS } from '@/lib/contests/constants';

function makeContest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contest-1',
    slug: 'test-contest',
    status: 'CALCULATING',
    prizePool: new FakeDecimal(1000),
    platformFeePct: new FakeDecimal(0.1),
    creatorFeePct: new FakeDecimal(0.1),
    entryFee: new FakeDecimal(100),
    entryCount: 10,
    prizeModel: PRIZE_MODELS.FEE_FUNDED,
    creatorUsername: 'creator1',
    ...overrides,
  };
}

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    username: 'user1',
    totalScore: new FakeDecimal(100),
    entryData: { tieBreaker: 50 },
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('calculateSettlement', () => {
  describe('FEE_FUNDED model', () => {
    it('calculates fees and prize splits from accumulated pool', async () => {
      const contest = makeContest({ prizePool: new FakeDecimal(1000) });
      mockContestFindUnique.mockResolvedValue(contest);
      mockEntryFindMany.mockResolvedValue([
        makeEntry({ id: 'e1', username: 'alice', totalScore: new FakeDecimal(300) }),
        makeEntry({ id: 'e2', username: 'bob', totalScore: new FakeDecimal(200) }),
        makeEntry({ id: 'e3', username: 'carol', totalScore: new FakeDecimal(100) }),
      ]);

      const result = await calculateSettlement('contest-1');

      expect(result.prizeModel).toBe(PRIZE_MODELS.FEE_FUNDED);
      expect(result.platformFee.toNumber()).toBe(100); // 10% of 1000
      expect(result.creatorFee.toNumber()).toBe(100); // 10% of 1000
      expect(result.prizePoolNet.toNumber()).toBe(800); // 1000 - 100 - 100
      expect(result.entryFeesCollected.toNumber()).toBe(1000); // 10 entries × 100

      expect(result.placements).toHaveLength(3);
      expect(result.placements[0].username).toBe('alice');
      expect(result.placements[0].payoutAmount.toNumber()).toBe(480); // 800 × 0.6
      expect(result.placements[1].payoutAmount.toNumber()).toBe(200); // 800 × 0.25
      expect(result.placements[2].payoutAmount.toNumber()).toBe(120); // 800 × 0.15
    });

    it('returns zero fees and empty placements when no entries', async () => {
      mockContestFindUnique.mockResolvedValue(makeContest());
      mockEntryFindMany.mockResolvedValue([]);

      const result = await calculateSettlement('contest-1');

      expect(result.placements).toHaveLength(0);
      expect(result.platformFee.toNumber()).toBe(100);
      expect(result.creatorFee.toNumber()).toBe(100);
    });
  });

  describe('FIXED model', () => {
    it('uses fixed prize pool with zero fees', async () => {
      const contest = makeContest({
        prizeModel: PRIZE_MODELS.FIXED,
        prizePool: new FakeDecimal(500),
        platformFeePct: new FakeDecimal(0),
        creatorFeePct: new FakeDecimal(0),
        entryFee: new FakeDecimal(50),
        entryCount: 20,
      });
      mockContestFindUnique.mockResolvedValue(contest);
      mockEntryFindMany.mockResolvedValue([
        makeEntry({ id: 'e1', username: 'alice', totalScore: new FakeDecimal(300) }),
        makeEntry({ id: 'e2', username: 'bob', totalScore: new FakeDecimal(200) }),
        makeEntry({ id: 'e3', username: 'carol', totalScore: new FakeDecimal(100) }),
      ]);

      const result = await calculateSettlement('contest-1');

      expect(result.prizeModel).toBe(PRIZE_MODELS.FIXED);
      expect(result.platformFee.toNumber()).toBe(0);
      expect(result.creatorFee.toNumber()).toBe(0);
      expect(result.prizePoolNet.toNumber()).toBe(500); // Fixed pool, no deductions
      expect(result.entryFeesCollected.toNumber()).toBe(1000); // 20 × 50

      expect(result.placements[0].payoutAmount.toNumber()).toBe(300); // 500 × 0.6
      expect(result.placements[1].payoutAmount.toNumber()).toBe(125); // 500 × 0.25
      expect(result.placements[2].payoutAmount.toNumber()).toBe(75); // 500 × 0.15
    });

    it('handles fixed model with fewer than 3 entries', async () => {
      const contest = makeContest({
        prizeModel: PRIZE_MODELS.FIXED,
        prizePool: new FakeDecimal(1000),
        platformFeePct: new FakeDecimal(0),
        creatorFeePct: new FakeDecimal(0),
        entryCount: 1,
        entryFee: new FakeDecimal(100),
      });
      mockContestFindUnique.mockResolvedValue(contest);
      mockEntryFindMany.mockResolvedValue([
        makeEntry({ id: 'e1', username: 'alice', totalScore: new FakeDecimal(100) }),
      ]);

      const result = await calculateSettlement('contest-1');

      // Only 1 entry: gets 100% of the net pool (scaled from 60%)
      expect(result.placements).toHaveLength(1);
      expect(result.placements[0].payoutAmount.toNumber()).toBe(1000); // 1000 × 0.6 / 0.6
    });
  });

  it('throws if contest not found', async () => {
    mockContestFindUnique.mockResolvedValue(null);
    await expect(calculateSettlement('missing')).rejects.toThrow('Contest not found');
  });

  it('throws if contest not in CALCULATING status', async () => {
    mockContestFindUnique.mockResolvedValue(makeContest({ status: 'ACTIVE' }));
    await expect(calculateSettlement('contest-1')).rejects.toThrow('must be in CALCULATING');
  });

  it('resolves ties using tieBreaker', async () => {
    mockContestFindUnique.mockResolvedValue(makeContest());
    mockEntryFindMany.mockResolvedValue([
      makeEntry({
        id: 'e1',
        username: 'alice',
        totalScore: new FakeDecimal(200),
        entryData: { tieBreaker: 45 },
      }),
      makeEntry({
        id: 'e2',
        username: 'bob',
        totalScore: new FakeDecimal(200),
        entryData: { tieBreaker: 52 },
      }),
      makeEntry({ id: 'e3', username: 'carol', totalScore: new FakeDecimal(100) }),
    ]);

    const result = await calculateSettlement('contest-1', { actualTotalGoals: 50 });

    // alice: |45-50| = 5, bob: |52-50| = 2 → bob is closer → bob gets 1st
    expect(result.placements[0].username).toBe('bob');
    expect(result.placements[1].username).toBe('alice');
    expect(result.placements[2].username).toBe('carol');
  });
});
