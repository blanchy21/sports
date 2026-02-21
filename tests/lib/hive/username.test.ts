/** @jest-environment node */

import {
  isValidHiveUsername,
  suggestUsername,
  checkUsernameAvailability,
} from '@/lib/hive/username';

jest.mock('@/lib/hive-workerbee/account', () => ({
  isHiveAccount: jest.fn(),
}));

import { isHiveAccount } from '@/lib/hive-workerbee/account';

const mockIsHiveAccount = isHiveAccount as jest.MockedFunction<typeof isHiveAccount>;

// ---------------------------------------------------------------------------
// isValidHiveUsername
// ---------------------------------------------------------------------------

describe('isValidHiveUsername', () => {
  it('accepts a valid username', () => {
    expect(isValidHiveUsername('sb-testuser')).toEqual({ valid: true });
  });

  it('accepts a minimal 3-char username', () => {
    expect(isValidHiveUsername('abc')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = isValidHiveUsername('');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/required/i);
  });

  it('rejects too short (< 3 chars)', () => {
    const result = isValidHiveUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/at least 3/);
  });

  it('rejects too long (> 16 chars)', () => {
    const result = isValidHiveUsername('a'.repeat(17));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/at most 16/);
  });

  it('rejects uppercase characters', () => {
    const result = isValidHiveUsername('TestUser');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/lowercase/);
  });

  it('rejects usernames starting with a digit', () => {
    const result = isValidHiveUsername('1user');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/start with a letter/);
  });

  it('rejects consecutive dashes', () => {
    const result = isValidHiveUsername('sb--user');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/consecutive dashes/);
  });

  it('rejects consecutive dots', () => {
    const result = isValidHiveUsername('sb..user');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/consecutive dots/);
  });

  it('rejects segments shorter than 3 chars when split by dot', () => {
    const result = isValidHiveUsername('abc.de');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/at least 3 characters/);
  });

  it('accepts valid dotted username with sufficient segments', () => {
    expect(isValidHiveUsername('abc.def')).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// suggestUsername
// ---------------------------------------------------------------------------

describe('suggestUsername', () => {
  it('creates sb- prefixed username from display name', () => {
    expect(suggestUsername('Paul')).toBe('sb-paul');
  });

  it('strips special characters', () => {
    expect(suggestUsername('John Doe!')).toBe('sb-johndoe');
  });

  it('returns sb-user for empty/special-only input', () => {
    expect(suggestUsername('')).toBe('sb-user');
    expect(suggestUsername('!!!@@@')).toBe('sb-user');
  });

  it('truncates long names to fit 16 char limit', () => {
    const result = suggestUsername('areallylongdisplayname');
    // sb- prefix (3 chars) + max 13 chars = 16
    expect(result.length).toBeLessThanOrEqual(16);
    expect(result).toBe('sb-areallylongdi');
  });
});

// ---------------------------------------------------------------------------
// checkUsernameAvailability
// ---------------------------------------------------------------------------

describe('checkUsernameAvailability', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns true when account does not exist', async () => {
    mockIsHiveAccount.mockResolvedValue(false);
    const available = await checkUsernameAvailability('sb-newuser');
    expect(available).toBe(true);
    expect(mockIsHiveAccount).toHaveBeenCalledWith('sb-newuser');
  });

  it('returns false when account already exists', async () => {
    mockIsHiveAccount.mockResolvedValue(true);
    const available = await checkUsernameAvailability('sb-taken');
    expect(available).toBe(false);
  });
});
