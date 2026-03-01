import { FakeDecimal } from '../../__mocks__/prisma-client';
import { decimalToNumber, serializePrediction } from '@/lib/predictions/serialize';

function makePrediction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pred-1',
    creatorUsername: 'alice',
    title: 'Who wins?',
    sportCategory: 'Football',
    matchReference: 'match-123',
    locksAt: new Date('2026-03-01T12:00:00Z'),
    status: 'OPEN' as const,
    totalPool: new FakeDecimal(100),
    winningOutcomeId: null,
    hiveAuthor: null,
    hivePermlink: null,
    isVoid: false,
    voidReason: null,
    settledAt: null,
    settledBy: null,
    createdAt: new Date('2026-02-28T10:00:00Z'),
    platformCut: new FakeDecimal(0),
    burnedAmount: new FakeDecimal(0),
    rewardPoolAmount: new FakeDecimal(0),
    outcomes: [
      {
        id: 'out-1',
        label: 'Team A',
        totalStaked: new FakeDecimal(60),
        backerCount: 3,
        isWinner: false,
      },
      {
        id: 'out-2',
        label: 'Team B',
        totalStaked: new FakeDecimal(40),
        backerCount: 2,
        isWinner: false,
      },
    ],
    stakes: [],
    ...overrides,
  };
}

describe('decimalToNumber', () => {
  it('returns 0 for null', () => {
    expect(decimalToNumber(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(decimalToNumber(undefined)).toBe(0);
  });

  it('converts Decimal to number', () => {
    expect(decimalToNumber(new FakeDecimal(42.5) as never)).toBe(42.5);
  });

  it('handles zero Decimal', () => {
    expect(decimalToNumber(new FakeDecimal(0) as never)).toBe(0);
  });
});

describe('serializePrediction', () => {
  it('serializes a basic prediction', () => {
    const prediction = makePrediction();
    const result = serializePrediction(prediction as never);

    expect(result.id).toBe('pred-1');
    expect(result.creatorUsername).toBe('alice');
    expect(result.title).toBe('Who wins?');
    expect(result.totalPool).toBe(100);
    expect(result.locksAt).toBe('2026-03-01T12:00:00.000Z');
    expect(result.createdAt).toBe('2026-02-28T10:00:00.000Z');
    expect(result.outcomes).toHaveLength(2);
  });

  it('calculates odds for each outcome', () => {
    const prediction = makePrediction();
    const result = serializePrediction(prediction as never);

    expect(result.outcomes[0].totalStaked).toBe(60);
    expect(result.outcomes[0].percentage).toBeCloseTo(60);
    expect(result.outcomes[0].odds).toBeCloseTo(1.5);

    expect(result.outcomes[1].totalStaked).toBe(40);
    expect(result.outcomes[1].percentage).toBeCloseTo(40);
    expect(result.outcomes[1].odds).toBeCloseTo(2.25);
  });

  it('includes user stakes when currentUsername matches', () => {
    const prediction = makePrediction({
      stakes: [
        {
          id: 'stake-1',
          username: 'bob',
          outcomeId: 'out-1',
          amount: new FakeDecimal(25),
          payout: null,
          refunded: false,
        },
      ],
    });
    const result = serializePrediction(prediction as never, 'bob');

    expect(result.userStakes).toBeDefined();
    expect(result.userStakes).toHaveLength(1);
    expect(result.userStakes![0].outcomeId).toBe('out-1');
    expect(result.userStakes![0].amount).toBe(25);
  });

  it('omits user stakes when user has none', () => {
    const prediction = makePrediction({
      stakes: [
        {
          id: 'stake-1',
          username: 'bob',
          outcomeId: 'out-1',
          amount: new FakeDecimal(25),
          payout: null,
          refunded: false,
        },
      ],
    });
    const result = serializePrediction(prediction as never, 'charlie');

    expect(result.userStakes).toBeUndefined();
  });

  it('includes stakers when includeStakers is true (default)', () => {
    const prediction = makePrediction({
      stakes: [
        {
          id: 's1',
          username: 'bob',
          outcomeId: 'out-1',
          amount: new FakeDecimal(25),
          payout: null,
          refunded: false,
        },
        {
          id: 's2',
          username: 'carol',
          outcomeId: 'out-1',
          amount: new FakeDecimal(15),
          payout: null,
          refunded: false,
        },
      ],
    });
    const result = serializePrediction(prediction as never);

    expect(result.outcomes[0].stakers).toBeDefined();
    expect(result.outcomes[0].stakers).toHaveLength(2);
    expect(result.outcomes[0].stakers![0].username).toBe('bob');
    expect(result.outcomes[0].stakers![0].amount).toBe(25);
  });

  it('excludes stakers when includeStakers is false', () => {
    const prediction = makePrediction({
      stakes: [
        {
          id: 's1',
          username: 'bob',
          outcomeId: 'out-1',
          amount: new FakeDecimal(25),
          payout: null,
          refunded: false,
        },
      ],
    });
    const result = serializePrediction(prediction as never, undefined, { includeStakers: false });

    expect(result.outcomes[0].stakers).toBeUndefined();
  });

  it('aggregates multiple stakes from same user on same outcome', () => {
    const prediction = makePrediction({
      stakes: [
        {
          id: 's1',
          username: 'bob',
          outcomeId: 'out-1',
          amount: new FakeDecimal(10),
          payout: null,
          refunded: false,
        },
        {
          id: 's2',
          username: 'bob',
          outcomeId: 'out-1',
          amount: new FakeDecimal(15),
          payout: null,
          refunded: false,
        },
      ],
    });
    const result = serializePrediction(prediction as never);

    expect(result.outcomes[0].stakers).toHaveLength(1);
    expect(result.outcomes[0].stakers![0].amount).toBe(25);
  });

  describe('canModify logic', () => {
    it('is true when creator + OPEN + no non-creator stakes', () => {
      const prediction = makePrediction({
        stakes: [
          {
            id: 's1',
            username: 'alice',
            outcomeId: 'out-1',
            amount: new FakeDecimal(25),
            payout: null,
            refunded: false,
          },
        ],
      });
      const result = serializePrediction(prediction as never, 'alice');
      expect(result.canModify).toBe(true);
    });

    it('is false when non-creator has staked', () => {
      const prediction = makePrediction({
        stakes: [
          {
            id: 's1',
            username: 'alice',
            outcomeId: 'out-1',
            amount: new FakeDecimal(25),
            payout: null,
            refunded: false,
          },
          {
            id: 's2',
            username: 'bob',
            outcomeId: 'out-1',
            amount: new FakeDecimal(10),
            payout: null,
            refunded: false,
          },
        ],
      });
      const result = serializePrediction(prediction as never, 'alice');
      expect(result.canModify).toBe(false);
    });

    it('is false when status is not OPEN', () => {
      const prediction = makePrediction({ status: 'LOCKED' });
      const result = serializePrediction(prediction as never, 'alice');
      expect(result.canModify).toBe(false);
    });

    it('is false for non-creator users', () => {
      const prediction = makePrediction();
      const result = serializePrediction(prediction as never, 'bob');
      expect(result.canModify).toBe(false);
    });

    it('is false when no currentUsername provided', () => {
      const prediction = makePrediction();
      const result = serializePrediction(prediction as never);
      expect(result.canModify).toBe(false);
    });
  });

  it('includes settlement data when platformCut > 0', () => {
    const prediction = makePrediction({
      status: 'SETTLED',
      platformCut: new FakeDecimal(10),
      burnedAmount: new FakeDecimal(5),
      rewardPoolAmount: new FakeDecimal(5),
    });
    const result = serializePrediction(prediction as never);

    expect(result.settlement).toBeDefined();
    expect(result.settlement!.platformCut).toBe(10);
    expect(result.settlement!.burnedAmount).toBe(5);
    expect(result.settlement!.rewardPoolAmount).toBe(5);
  });

  it('omits settlement data when platformCut is 0', () => {
    const prediction = makePrediction();
    const result = serializePrediction(prediction as never);

    expect(result.settlement).toBeUndefined();
  });
});
