import {
  applyRoundResult,
  canBuyBack,
  firstKickoff,
  isRoundComplete,
  rankEntries,
  resolvePickResult,
  sumMatchGoals,
  validateRoundMatches,
} from '@/lib/hol/utils';
import type { HolMatch } from '@/lib/hol/types';

function match(overrides: Partial<HolMatch> = {}): HolMatch {
  return {
    league: 'EPL',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    kickoff: '2026-04-20T14:00:00Z',
    homeGoals: 1,
    awayGoals: 2,
    ...overrides,
  };
}

describe('sumMatchGoals', () => {
  it('sums goals across all non-postponed matches', () => {
    expect(
      sumMatchGoals([match({ homeGoals: 2, awayGoals: 1 }), match({ homeGoals: 0, awayGoals: 3 })])
    ).toBe(6);
  });
  it('ignores postponed matches', () => {
    expect(
      sumMatchGoals([
        match({ homeGoals: 2, awayGoals: 1 }),
        match({ postponed: true, homeGoals: 99, awayGoals: 99 }),
      ])
    ).toBe(3);
  });
  it('ignores matches with null goals', () => {
    expect(sumMatchGoals([match({ homeGoals: null, awayGoals: null })])).toBe(0);
  });
});

describe('resolvePickResult', () => {
  it('returns "tie" when actual equals baseline', () => {
    expect(resolvePickResult('higher', 10, 10)).toBe('tie');
    expect(resolvePickResult('lower', 10, 10)).toBe('tie');
  });
  it('returns "correct" when guess matches direction', () => {
    expect(resolvePickResult('higher', 10, 12)).toBe('correct');
    expect(resolvePickResult('lower', 10, 7)).toBe('correct');
  });
  it('returns "incorrect" when guess contradicts direction', () => {
    expect(resolvePickResult('higher', 10, 7)).toBe('incorrect');
    expect(resolvePickResult('lower', 10, 12)).toBe('incorrect');
  });
});

describe('applyRoundResult', () => {
  const alive = [
    { id: 'e1', username: 'alice', status: 'alive' as const },
    { id: 'e2', username: 'bob', status: 'alive' as const },
    { id: 'e3', username: 'carol', status: 'alive' as const },
  ];

  it('survives correct + tie picks, eliminates incorrect', () => {
    const picks = new Map([
      ['e1', { guess: 'higher' as const }],
      ['e2', { guess: 'lower' as const }],
      ['e3', { guess: 'higher' as const }],
    ]);
    const diffs = applyRoundResult(alive, picks, 10, 12, 2);
    expect(diffs).toHaveLength(3);
    expect(diffs.find((d) => d.username === 'alice')?.newStatus).toBe('alive');
    expect(diffs.find((d) => d.username === 'bob')?.newStatus).toBe('eliminated');
    expect(diffs.find((d) => d.username === 'bob')?.eliminatedRound).toBe(2);
  });

  it('ties survive (actual === baseline)', () => {
    const picks = new Map([['e1', { guess: 'higher' as const }]]);
    const diffs = applyRoundResult([alive[0]], picks, 10, 10, 2);
    expect(diffs[0].pickResult).toBe('tie');
    expect(diffs[0].newStatus).toBe('alive');
  });

  it('no pick submitted → eliminated', () => {
    const diffs = applyRoundResult([alive[0]], new Map(), 10, 12, 2);
    expect(diffs[0].newStatus).toBe('eliminated');
    expect(diffs[0].eliminatedRound).toBe(2);
  });

  it('ignores already-eliminated entries', () => {
    const diffs = applyRoundResult(
      [{ id: 'e1', username: 'alice', status: 'eliminated' }],
      new Map(),
      10,
      12,
      2
    );
    expect(diffs).toHaveLength(0);
  });
});

describe('canBuyBack', () => {
  it('allows when eliminated, under cap, next round upcoming', () => {
    expect(
      canBuyBack({
        entryStatus: 'eliminated',
        buyBacksUsed: 0,
        maxBuyBacks: 2,
        nextRoundStatus: 'upcoming',
      })
    ).toBe(true);
  });
  it('blocks at cap', () => {
    expect(
      canBuyBack({
        entryStatus: 'eliminated',
        buyBacksUsed: 2,
        maxBuyBacks: 2,
        nextRoundStatus: 'upcoming',
      })
    ).toBe(false);
  });
  it('blocks when still alive', () => {
    expect(
      canBuyBack({
        entryStatus: 'alive',
        buyBacksUsed: 0,
        maxBuyBacks: 2,
        nextRoundStatus: 'upcoming',
      })
    ).toBe(false);
  });
  it('blocks when no upcoming round', () => {
    expect(
      canBuyBack({
        entryStatus: 'eliminated',
        buyBacksUsed: 0,
        maxBuyBacks: 2,
        nextRoundStatus: 'locked',
      })
    ).toBe(false);
    expect(
      canBuyBack({
        entryStatus: 'eliminated',
        buyBacksUsed: 0,
        maxBuyBacks: 2,
        nextRoundStatus: null,
      })
    ).toBe(false);
  });
});

describe('rankEntries', () => {
  it('orders alive > eliminated, then latest elimination first', () => {
    const ranked = rankEntries([
      {
        username: 'a',
        status: 'eliminated',
        buyBacksUsed: 0,
        eliminatedRound: 2,
        joinedAt: '2026-01-01T00:00:00Z',
      },
      {
        username: 'b',
        status: 'alive',
        buyBacksUsed: 0,
        eliminatedRound: null,
        joinedAt: '2026-01-01T00:00:00Z',
      },
      {
        username: 'c',
        status: 'eliminated',
        buyBacksUsed: 0,
        eliminatedRound: 5,
        joinedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    expect(ranked.map((r) => r.username)).toEqual(['b', 'c', 'a']);
  });
});

describe('validateRoundMatches', () => {
  it('requires exactly 5 matches', () => {
    expect(validateRoundMatches([match(), match(), match(), match()])).toBe(false);
    expect(validateRoundMatches([match(), match(), match(), match(), match()])).toBe(true);
  });
});

describe('isRoundComplete', () => {
  it('true when all non-postponed have goals', () => {
    expect(isRoundComplete([match(), match()])).toBe(true);
  });
  it('false when any missing goals', () => {
    expect(isRoundComplete([match({ homeGoals: null, awayGoals: null })])).toBe(false);
  });
  it('false when all postponed (nothing playable)', () => {
    expect(isRoundComplete([match({ postponed: true })])).toBe(false);
  });
});

describe('firstKickoff', () => {
  it('returns earliest kickoff', () => {
    const d = firstKickoff([
      match({ kickoff: '2026-04-20T16:00:00Z' }),
      match({ kickoff: '2026-04-20T14:00:00Z' }),
      match({ kickoff: '2026-04-20T15:00:00Z' }),
    ]);
    expect(d?.toISOString()).toBe('2026-04-20T14:00:00.000Z');
  });
});
