import { isUserAccountData, hasValidAccountData } from '@/contexts/auth/auth-type-guards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidAccountData() {
  return {
    username: 'testuser',
    reputation: 65,
    liquidHiveBalance: 100,
    liquidHbdBalance: 50,
    hivePower: 200,
    resourceCredits: 99,
    profile: { name: 'Test' },
    stats: { postCount: 10 },
  };
}

// ---------------------------------------------------------------------------
// isUserAccountData
// ---------------------------------------------------------------------------

describe('isUserAccountData', () => {
  it('returns true for a valid UserAccountData object', () => {
    expect(isUserAccountData(makeValidAccountData())).toBe(true);
  });

  it('returns false for null', () => {
    expect(isUserAccountData(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isUserAccountData(undefined)).toBe(false);
  });

  it('returns false for a non-object primitive', () => {
    expect(isUserAccountData('string')).toBe(false);
    expect(isUserAccountData(42)).toBe(false);
    expect(isUserAccountData(true)).toBe(false);
  });

  it('returns false when username is not a string', () => {
    const data = { ...makeValidAccountData(), username: 123 };
    expect(isUserAccountData(data)).toBe(false);
  });

  it('returns false when a numeric field is the wrong type', () => {
    const fields = [
      'reputation',
      'liquidHiveBalance',
      'liquidHbdBalance',
      'hivePower',
      'resourceCredits',
    ] as const;

    for (const field of fields) {
      const data = { ...makeValidAccountData(), [field]: 'not-a-number' };
      expect(isUserAccountData(data)).toBe(false);
    }
  });

  it('returns false when profile is null', () => {
    const data = { ...makeValidAccountData(), profile: null };
    expect(isUserAccountData(data)).toBe(false);
  });

  it('returns false when stats is null', () => {
    const data = { ...makeValidAccountData(), stats: null };
    expect(isUserAccountData(data)).toBe(false);
  });

  it('returns false when profile is a non-object', () => {
    const data = { ...makeValidAccountData(), profile: 'not-an-object' };
    expect(isUserAccountData(data)).toBe(false);
  });

  it('returns false when a required field is missing entirely', () => {
    const data = makeValidAccountData();
    delete (data as Record<string, unknown>).hivePower;
    expect(isUserAccountData(data)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasValidAccountData
// ---------------------------------------------------------------------------

describe('hasValidAccountData', () => {
  it('returns true for { success: true, account: <valid> }', () => {
    const result = { success: true, account: makeValidAccountData() };
    expect(hasValidAccountData(result)).toBe(true);
  });

  it('returns false when success is not true', () => {
    const result = { success: false, account: makeValidAccountData() };
    expect(hasValidAccountData(result)).toBe(false);
  });

  it('returns false when account data is invalid', () => {
    const result = { success: true, account: { username: 123 } };
    expect(hasValidAccountData(result)).toBe(false);
  });

  it('returns false for null input', () => {
    expect(hasValidAccountData(null)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(hasValidAccountData(undefined)).toBe(false);
  });

  it('returns false when account key is missing', () => {
    expect(hasValidAccountData({ success: true })).toBe(false);
  });
});
