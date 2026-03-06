import { validateWorldCupEntry } from '@/lib/contests/validation';
import { WORLD_CUP_2026_TEAMS } from '@/lib/contests/world-cup-teams';

// Build lookups from seed data
const validTeamCodes = new Set(WORLD_CUP_2026_TEAMS.map((t) => t.code));
const teamPotMap = new Map(WORLD_CUP_2026_TEAMS.map((t) => [t.code, t.pot]));

// Helper: make a valid entry
function makeValidEntry() {
  const pot1 = ['USA', 'ARG', 'FRA', 'BRA'];
  const pot2 = ['ITA', 'CRO', 'JPN', 'MAR'];
  const pot3 = ['ECU', 'KOR', 'TUR', 'SRB'];
  const pot4 = ['PAN', 'CRC', 'JAM', 'HON'];
  const allTeams = [...pot1, ...pot2, ...pot3, ...pot4];

  return {
    picks: allTeams.map((code, i) => ({
      teamCode: code,
      pot: teamPotMap.get(code)!,
      multiplier: i + 1,
    })),
    tieBreaker: 142,
  };
}

describe('validateWorldCupEntry', () => {
  it('accepts a valid entry', () => {
    const result = validateWorldCupEntry(makeValidEntry(), validTeamCodes, teamPotMap);
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeDefined();
    expect(result.parsed!.picks).toHaveLength(16);
    expect(result.parsed!.tieBreaker).toBe(142);
  });

  it('rejects null data', () => {
    const result = validateWorldCupEntry(null, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it('rejects non-array picks', () => {
    const result = validateWorldCupEntry({ picks: 'not-array', tieBreaker: 100 }, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/array/i);
  });

  it('rejects wrong number of picks', () => {
    const entry = makeValidEntry();
    entry.picks = entry.picks.slice(0, 10);
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exactly 16/);
  });

  it('rejects invalid team code', () => {
    const entry = makeValidEntry();
    entry.picks[0].teamCode = 'INVALID';
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid team code/);
  });

  it('rejects duplicate team', () => {
    const entry = makeValidEntry();
    entry.picks[1].teamCode = entry.picks[0].teamCode;
    entry.picks[1].pot = entry.picks[0].pot;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Duplicate team/);
  });

  it('rejects wrong pot assignment', () => {
    const entry = makeValidEntry();
    entry.picks[0].pot = 3; // USA is pot 1
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Wrong pot/);
  });

  it('rejects more than 4 teams from one pot', () => {
    const entry = makeValidEntry();
    // Replace a pot 2 team with a pot 1 team (need to swap to keep 16 total)
    entry.picks[4] = { teamCode: 'ESP', pot: 1, multiplier: 5 }; // ESP is pot 1
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    // Should fail on wrong pot (ESP is pot 1 but we said pot 1) or pot count
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate multiplier', () => {
    const entry = makeValidEntry();
    entry.picks[1].multiplier = entry.picks[0].multiplier;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Duplicate multiplier/);
  });

  it('rejects multiplier out of range', () => {
    const entry = makeValidEntry();
    entry.picks[0].multiplier = 0;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Multiplier must be/);
  });

  it('rejects multiplier = 17', () => {
    const entry = makeValidEntry();
    entry.picks[0].multiplier = 17;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Multiplier must be/);
  });

  it('rejects non-integer multiplier', () => {
    const entry = makeValidEntry();
    entry.picks[0].multiplier = 1.5;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Multiplier must be/);
  });

  it('rejects missing tieBreaker', () => {
    const entry = makeValidEntry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry as any).tieBreaker = undefined;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Tie-breaker/);
  });

  it('rejects negative tieBreaker', () => {
    const entry = makeValidEntry();
    entry.tieBreaker = -5;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Tie-breaker/);
  });

  it('rejects tieBreaker > 500', () => {
    const entry = makeValidEntry();
    entry.tieBreaker = 501;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Tie-breaker/);
  });

  it('accepts edge case tieBreaker = 0', () => {
    const entry = makeValidEntry();
    entry.tieBreaker = 0;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(true);
  });

  it('accepts edge case tieBreaker = 500', () => {
    const entry = makeValidEntry();
    entry.tieBreaker = 500;
    const result = validateWorldCupEntry(entry, validTeamCodes, teamPotMap);
    expect(result.valid).toBe(true);
  });
});
