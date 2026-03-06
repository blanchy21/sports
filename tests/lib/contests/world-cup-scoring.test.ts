import { calculateWorldCupScore } from '@/lib/contests/scoring/world-cup';
import type { MatchResult, WorldCupPick } from '@/lib/contests/types';

// Helper: make a set of 16 picks with sequential multipliers
function makePicks(teamCodes: string[]): WorldCupPick[] {
  return teamCodes.map((code, i) => ({
    teamCode: code,
    pot: Math.floor(i / 4) + 1,
    multiplier: i + 1, // 1 through 16
  }));
}

describe('calculateWorldCupScore', () => {
  const picks = makePicks([
    'USA', 'ARG', 'FRA', 'BRA', // Pot 1 - multipliers 1,2,3,4
    'ITA', 'CRO', 'JPN', 'MAR', // Pot 2 - multipliers 5,6,7,8
    'ECU', 'KOR', 'TUR', 'SRB', // Pot 3 - multipliers 9,10,11,12
    'PAN', 'CRC', 'JAM', 'HON', // Pot 4 - multipliers 13,14,15,16
  ]);

  it('returns 0 when no matches played', () => {
    expect(calculateWorldCupScore(picks, [])).toBe(0);
  });

  it('scores a simple win correctly', () => {
    // ARG wins 2-1 (multiplier = 2)
    // Base: 3 (win) + 2 (goals) = 5, × 2 = 10
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'ARG', awayTeamCode: 'KSA', homeScore: 2, awayScore: 1 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(10);
  });

  it('scores a draw correctly', () => {
    // FRA draws 1-1 (multiplier = 3)
    // Base: 1 (draw) + 1 (goal) = 2, × 3 = 6
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'FRA', awayTeamCode: 'DEN', homeScore: 1, awayScore: 1 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(6);
  });

  it('scores a loss (only goals count)', () => {
    // USA loses 1-3 (multiplier = 1)
    // Base: 0 (loss) + 1 (goal) = 1, × 1 = 1
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'USA', awayTeamCode: 'GER', homeScore: 1, awayScore: 3 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(1);
  });

  it('scores both teams when both are picked', () => {
    // ARG (mult 2) vs FRA (mult 3), ARG wins 3-2
    // ARG: 3 (win) + 3 (goals) = 6, × 2 = 12
    // FRA: 0 (loss) + 2 (goals) = 2, × 3 = 6
    // Total: 18
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'ARG', awayTeamCode: 'FRA', homeScore: 3, awayScore: 2 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(18);
  });

  it('ignores matches with non-picked teams', () => {
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'GER', awayTeamCode: 'ESP', homeScore: 2, awayScore: 0 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(0);
  });

  it('accumulates score across multiple matches', () => {
    // Match 1: ARG (mult 2) wins 1-0 → (3+1)×2 = 8
    // Match 2: ARG (mult 2) draws 0-0 → (1+0)×2 = 2
    // Match 3: BRA (mult 4) wins 3-0 → (3+3)×4 = 24
    // Total: 34
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'ARG', awayTeamCode: 'KSA', homeScore: 1, awayScore: 0 },
      { matchNumber: 2, round: 'group', homeTeamCode: 'ARG', awayTeamCode: 'MEX', homeScore: 0, awayScore: 0 },
      { matchNumber: 3, round: 'group', homeTeamCode: 'BRA', awayTeamCode: 'SUI', homeScore: 3, awayScore: 0 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(34);
  });

  it('scores away team correctly', () => {
    // BRA (mult 4) is away and wins 0-2
    // Base: 3 (win) + 2 (goals) = 5, × 4 = 20
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'SUI', awayTeamCode: 'BRA', homeScore: 0, awayScore: 2 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(20);
  });

  describe('knockout bonuses', () => {
    it('awards round_of_32 bonus for reaching knockout stage', () => {
      // ARG (mult 2) plays in round_of_32, wins 1-0
      // Match points: (3+1) × 2 = 8
      // Knockout bonus: 2 (R32) × 2 = 4
      // Total: 12
      const matches: MatchResult[] = [
        { matchNumber: 49, round: 'round_of_32', homeTeamCode: 'ARG', awayTeamCode: 'KSA', homeScore: 1, awayScore: 0 },
      ];
      expect(calculateWorldCupScore(picks, matches)).toBe(12);
    });

    it('awards cumulative knockout bonuses', () => {
      // ARG (mult 2) progresses through R32 and R16
      // R32 match: ARG wins 2-0 → (3+2)×2 = 10, bonus: 2×2 = 4
      // R16 match: ARG wins 1-0 → (3+1)×2 = 8, bonus: (2+3)×2 = 10
      // But bonuses are per team, not per match — highest round reached
      // ARG reaches R16: bonus = (2 + 3) × 2 = 10
      // Total: match_points (10 + 8) + bonus (10) = 28
      const matches: MatchResult[] = [
        { matchNumber: 49, round: 'round_of_32', homeTeamCode: 'ARG', awayTeamCode: 'KSA', homeScore: 2, awayScore: 0 },
        { matchNumber: 57, round: 'round_of_16', homeTeamCode: 'ARG', awayTeamCode: 'AUS', homeScore: 1, awayScore: 0 },
      ];
      expect(calculateWorldCupScore(picks, matches)).toBe(28);
    });

    it('awards champion bonus (cumulative with all prior rounds)', () => {
      // BRA (mult 4) goes all the way to champion
      // Knockout bonuses: R32(2) + R16(3) + QF(4) + SF(5) + champion(7) = 21
      // Total bonus: 21 × 4 = 84
      // Plus match points
      const matches: MatchResult[] = [
        { matchNumber: 49, round: 'round_of_32', homeTeamCode: 'BRA', awayTeamCode: 'QAT', homeScore: 3, awayScore: 0 },
        { matchNumber: 57, round: 'round_of_16', homeTeamCode: 'BRA', awayTeamCode: 'NGA', homeScore: 2, awayScore: 1 },
        { matchNumber: 61, round: 'quarter_final', homeTeamCode: 'BRA', awayTeamCode: 'GER', homeScore: 1, awayScore: 0 },
        { matchNumber: 63, round: 'semi_final', homeTeamCode: 'BRA', awayTeamCode: 'ESP', homeScore: 2, awayScore: 1 },
        { matchNumber: 64, round: 'final', homeTeamCode: 'BRA', awayTeamCode: 'ARG', homeScore: 2, awayScore: 1 },
      ];

      // BRA match points:
      // R32: (3+3)×4 = 24
      // R16: (3+2)×4 = 20
      // QF:  (3+1)×4 = 16
      // SF:  (3+2)×4 = 20
      // Final: (3+2)×4 = 20
      // BRA bonus: (2+3+4+5+7) × 4 = 84

      // ARG (mult 2) also in final (runner_up):
      // Final: (0+1)×2 = 2  (loss, 1 goal)
      // ARG bonus for reaching final: (2+3+4+5+6)×2 = 40
      // (ARG also appears in final as runner-up)

      // But ARG only has 1 knockout match in this data set (the final)
      // ARG reaches 'final' round → bonuses: R32(2)+R16(3)+QF(4)+SF(5)+runner_up(6) = 20
      // Wait — ARG only has one match (the final). Their highest round is 'final'.
      // Progression index for final = 4. Bonuses: R32(2)+R16(3)+QF(4)+SF(5) from rounds 0-4 = 14
      // Plus runner_up(6) = 20. Total: 20 × 2 = 40
      // ARG match points from final: (0+1)×2 = 2

      // Total: BRA(24+20+16+20+20+84) + ARG(2+40) = 184+42 = 226
      const score = calculateWorldCupScore(picks, matches);
      expect(score).toBe(226);
    });

    it('awards runner_up bonus correctly', () => {
      // Simple final: FRA (mult 3) loses to non-picked team
      // FRA is runner-up
      const matches: MatchResult[] = [
        { matchNumber: 64, round: 'final', homeTeamCode: 'GER', awayTeamCode: 'FRA', homeScore: 1, awayScore: 0 },
      ];

      // FRA match points: (0+0)×3 = 0
      // FRA reaches final: bonuses R32(2)+R16(3)+QF(4)+SF(5)+runner_up(6) = 20
      // Total bonus: 20 × 3 = 60
      expect(calculateWorldCupScore(picks, matches)).toBe(60);
    });
  });

  it('handles a 0-0 draw', () => {
    // USA (mult 1) draws 0-0
    // Base: 1 (draw) + 0 (goals) = 1, × 1 = 1
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'USA', awayTeamCode: 'WAL', homeScore: 0, awayScore: 0 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(1);
  });

  it('high-multiplier team produces large scores', () => {
    // HON (mult 16) wins 4-0
    // Base: 3 (win) + 4 (goals) = 7, × 16 = 112
    const matches: MatchResult[] = [
      { matchNumber: 1, round: 'group', homeTeamCode: 'HON', awayTeamCode: 'NZL', homeScore: 4, awayScore: 0 },
    ];
    expect(calculateWorldCupScore(picks, matches)).toBe(112);
  });
});
