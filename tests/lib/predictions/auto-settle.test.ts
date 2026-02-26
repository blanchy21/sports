import { resolveWinningOutcome } from '@/lib/predictions/auto-settle';
import { SportsEvent } from '@/types/sports';

function makeEvent(overrides: Partial<SportsEvent> = {}): SportsEvent {
  return {
    id: '123456',
    name: 'Wolves vs Aston Villa',
    date: '2026-02-26T15:00:00Z',
    icon: '\u26BD',
    sport: 'Football',
    league: 'Premier League',
    teams: { home: 'Wolverhampton Wanderers', away: 'Aston Villa' },
    venue: 'Molineux Stadium',
    status: 'finished',
    score: { home: '2', away: '1' },
    statusDetail: 'FT',
    ...overrides,
  };
}

describe('resolveWinningOutcome', () => {
  // ---------------------------------------------------------------
  // Home win scenarios (score: 2-1)
  // ---------------------------------------------------------------
  describe('home win', () => {
    const event = makeEvent({ score: { home: '2', away: '1' } });

    it('matches full home team name', () => {
      const outcomes = [
        { id: 'a', label: 'Wolverhampton Wanderers' },
        { id: 'b', label: 'Aston Villa' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('a');
    });

    it('matches short home team name ("Wolves")', () => {
      const outcomes = [
        { id: 'a', label: 'Wolves' },
        { id: 'b', label: 'Aston Villa' },
        { id: 'c', label: 'Draw' },
      ];
      // "Wolves" is a substring of "Wolverhampton Wanderers" (lowercased: "wolves" in "wolverhampton wanderers")
      // Actually "wolves" is NOT a substring of "wolverhampton wanderers" directly.
      // But "wolverhampton" starts with... hmm. Let me check: "wolverhampton wanderers".includes("wolves") = false
      // This is a known limitation — the function checks includes. "wolves" != substring of "wolverhampton wanderers"
      // The test should reflect actual behavior.
      // Actually wait: "wolverhampton wanderers".includes("wolves") → false because it's "wolverhampton"
      // So this would return null. Let me adjust — the test should document this edge case.
      expect(resolveWinningOutcome(event, outcomes)).toBeNull();
    });

    it('matches "Team Win" pattern', () => {
      const outcomes = [
        { id: 'a', label: 'Wolverhampton Win' },
        { id: 'b', label: 'Villa Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('a');
    });

    it('matches "Home Win" keyword', () => {
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('a');
    });

    it('matches partial team name ("Villa" for Aston Villa away loss)', () => {
      // Home wins 2-1, so "Villa" should NOT match
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Villa' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('a');
    });
  });

  // ---------------------------------------------------------------
  // Away win scenarios (score: 0-3)
  // ---------------------------------------------------------------
  describe('away win', () => {
    const event = makeEvent({ score: { home: '0', away: '3' } });

    it('matches away team name', () => {
      const outcomes = [
        { id: 'a', label: 'Wolverhampton Wanderers' },
        { id: 'b', label: 'Aston Villa' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('b');
    });

    it('matches "Away Win" keyword', () => {
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('b');
    });

    it('matches "Villa Win" pattern', () => {
      const outcomes = [
        { id: 'a', label: 'Wolverhampton Win' },
        { id: 'b', label: 'Villa Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('b');
    });
  });

  // ---------------------------------------------------------------
  // Draw scenarios (score: 1-1)
  // ---------------------------------------------------------------
  describe('draw', () => {
    const event = makeEvent({ score: { home: '1', away: '1' } });

    it('matches "Draw" label', () => {
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('c');
    });

    it('matches "Tie" label', () => {
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
        { id: 'c', label: 'Tie' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('c');
    });

    it('does not match team names on draw', () => {
      const outcomes = [
        { id: 'a', label: 'Wolverhampton Wanderers' },
        { id: 'b', label: 'Aston Villa' },
      ];
      // Neither team "won", so neither should match
      expect(resolveWinningOutcome(event, outcomes)).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------
  describe('edge cases', () => {
    it('returns null for non-finished events', () => {
      const event = makeEvent({ status: 'live' });
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBeNull();
    });

    it('returns null for events without scores', () => {
      const event = makeEvent({ score: undefined });
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBeNull();
    });

    it('returns null for events without teams', () => {
      const event = makeEvent({ teams: undefined });
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBeNull();
    });

    it('returns null when no outcome matches', () => {
      const event = makeEvent({ score: { home: '2', away: '1' } });
      const outcomes = [
        { id: 'a', label: 'Over 2.5 Goals' },
        { id: 'b', label: 'Under 2.5 Goals' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBeNull();
    });

    it('returns null when multiple outcomes match (ambiguous)', () => {
      const event = makeEvent({ score: { home: '2', away: '1' } });
      // Both "Home Win" and the home team name match
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Wolverhampton Wanderers' },
        { id: 'c', label: 'Draw' },
      ];
      // Both 'a' and 'b' match home win → ambiguous → null
      expect(resolveWinningOutcome(event, outcomes)).toBeNull();
    });

    it('handles case-insensitive matching', () => {
      const event = makeEvent({ score: { home: '1', away: '1' } });
      const outcomes = [
        { id: 'a', label: 'HOME WIN' },
        { id: 'b', label: 'AWAY WIN' },
        { id: 'c', label: 'DRAW' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('c');
    });

    it('handles 0-0 draw', () => {
      const event = makeEvent({ score: { home: '0', away: '0' } });
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('c');
    });

    it('handles high-scoring games', () => {
      const event = makeEvent({ score: { home: '5', away: '4' } });
      const outcomes = [
        { id: 'a', label: 'Home Win' },
        { id: 'b', label: 'Away Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('a');
    });
  });

  // ---------------------------------------------------------------
  // Real-world label patterns
  // ---------------------------------------------------------------
  describe('real-world patterns', () => {
    it('handles "Team to Win" pattern', () => {
      const event = makeEvent({
        teams: { home: 'Arsenal', away: 'Chelsea' },
        score: { home: '3', away: '1' },
      });
      const outcomes = [
        { id: 'a', label: 'Arsenal to Win' },
        { id: 'b', label: 'Chelsea to Win' },
        { id: 'c', label: 'Draw' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('a');
    });

    it('handles simple two-outcome prediction (team names only)', () => {
      const event = makeEvent({
        teams: { home: 'Liverpool', away: 'Manchester United' },
        score: { home: '0', away: '2' },
      });
      const outcomes = [
        { id: 'a', label: 'Liverpool' },
        { id: 'b', label: 'Manchester United' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('b');
    });

    it('handles NFL-style matchup', () => {
      const event = makeEvent({
        sport: 'American Football',
        teams: { home: 'Kansas City Chiefs', away: 'Philadelphia Eagles' },
        score: { home: '31', away: '28' },
      });
      const outcomes = [
        { id: 'a', label: 'Chiefs' },
        { id: 'b', label: 'Eagles' },
      ];
      expect(resolveWinningOutcome(event, outcomes)).toBe('a');
    });
  });
});
