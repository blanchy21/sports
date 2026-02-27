/** @jest-environment node */

import {
  calculateReputation,
  generatePermlink,
  generateUniquePermlink,
  parseAsset,
  formatAsset,
  vestingSharesToHive,
  isFromSportsblockApp,
  parseJsonMetadata,
  HiveError,
  handleHiveError,
} from '@/lib/utils/hive';

describe('calculateReputation', () => {
  it('converts positive raw reputation to score > 25', () => {
    const score = calculateReputation('95832978796820');
    expect(score).toBeGreaterThan(25);
  });

  it('returns 25 when numeric rep is 0 (after parseInt)', () => {
    // Passing numeric 0 bypasses the falsy check (0 is falsy but the function
    // checks !rawReputation first — numeric 0 is falsy, so it returns 0).
    // Actually: !0 === true, so it returns 0. The "rep === 0" branch only
    // triggers when parseInt of a non-falsy string yields 0.
    // Per the source: if (!rawReputation || rawReputation === '0') return 0;
    // Then: const rep = parseInt(rawReputation) ... if (rep === 0) return 25;
    // So we need a string that is truthy but parseInt yields 0, e.g. "00" or "0.5"
    // Actually "00" parseInt => 0 and "00" !== '0', so it passes the first guard.
    expect(calculateReputation('00')).toBe(25);
  });

  it('returns 0 for falsy string "0"', () => {
    expect(calculateReputation('0')).toBe(0);
  });

  it('returns 0 for empty string (falsy)', () => {
    expect(calculateReputation('')).toBe(0);
  });

  it('returns score >= 0 for negative raw reputation', () => {
    const score = calculateReputation('-95832978796820');
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('generatePermlink', () => {
  it('converts normal title to lowercase hyphenated permlink', () => {
    expect(generatePermlink('Hello World')).toBe('hello-world');
  });

  it('strips special characters', () => {
    expect(generatePermlink('Hello! @World #2024')).toBe('hello-world-2024');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generatePermlink('--hello world--')).toBe('hello-world');
  });

  it('collapses multiple spaces into single hyphen', () => {
    expect(generatePermlink('hello   world   test')).toBe('hello-world-test');
  });
});

describe('generateUniquePermlink', () => {
  it('returns base permlink when no collision', () => {
    expect(generateUniquePermlink('My Post', [])).toBe('my-post');
  });

  it('appends counter on collision', () => {
    const existing = ['my-post'];
    expect(generateUniquePermlink('My Post', existing)).toBe('my-post-1');
  });

  it('increments counter for multiple collisions', () => {
    const existing = ['my-post', 'my-post-1'];
    expect(generateUniquePermlink('My Post', existing)).toBe('my-post-2');
  });
});

describe('parseAsset', () => {
  it('parses valid "1.000 HIVE" string', () => {
    expect(parseAsset('1.000 HIVE')).toEqual({ amount: 1, symbol: 'HIVE' });
  });

  it('parses "123.456 HBD"', () => {
    expect(parseAsset('123.456 HBD')).toEqual({ amount: 123.456, symbol: 'HBD' });
  });

  it('returns zero amount and empty symbol for invalid format', () => {
    expect(parseAsset('invalid')).toEqual({ amount: 0, symbol: '' });
  });
});

describe('formatAsset', () => {
  it('formats with default 3 decimals', () => {
    expect(formatAsset(1, 'HIVE')).toBe('1.000 HIVE');
  });

  it('formats with custom decimals', () => {
    expect(formatAsset(1.5, 'HBD', 2)).toBe('1.50 HBD');
  });
});

describe('vestingSharesToHive', () => {
  it('calculates correct ratio', () => {
    // 100 shares out of 1000 total, fund of 500 HIVE => 50 HIVE
    expect(vestingSharesToHive('100', '1000', '500')).toBe(50);
  });

  it('returns 0 when total shares is 0', () => {
    expect(vestingSharesToHive('100', '0', '500')).toBe(0);
  });
});

describe('isFromSportsblockApp', () => {
  it('returns true for post with app=sportsblock in json_metadata', () => {
    expect(isFromSportsblockApp({ json_metadata: '{"app":"sportsblock"}' })).toBe(true);
  });

  it('returns true for post with category hive-115814', () => {
    expect(isFromSportsblockApp({ category: 'hive-115814' })).toBe(true);
  });

  it('returns true for post with sportsblock tag', () => {
    expect(isFromSportsblockApp({ json_metadata: '{"tags":["sportsblock"]}' })).toBe(true);
  });

  it('returns false for unrelated post', () => {
    expect(
      isFromSportsblockApp({ json_metadata: '{"app":"peakd"}', category: 'photography' })
    ).toBe(false);
  });
});

describe('parseJsonMetadata', () => {
  it('parses valid JSON', () => {
    expect(parseJsonMetadata('{"app":"sportsblock"}')).toEqual({ app: 'sportsblock' });
  });

  it('returns empty object for invalid JSON', () => {
    expect(parseJsonMetadata('not json')).toEqual({});
  });

  it('returns empty object for empty string', () => {
    expect(parseJsonMetadata('')).toEqual({});
  });
});

describe('HiveError', () => {
  it('has code and details properties', () => {
    const err = new HiveError('test error', 'TEST_CODE', { foo: 'bar' });
    expect(err.message).toBe('test error');
    expect(err.code).toBe('TEST_CODE');
    expect(err.details).toEqual({ foo: 'bar' });
    expect(err.name).toBe('HiveError');
  });
});

describe('handleHiveError', () => {
  it('maps "Insufficient Resource Credits" to INSUFFICIENT_RC', () => {
    const result = handleHiveError(new Error('Insufficient Resource Credits'));
    expect(result.code).toBe('INSUFFICIENT_RC');
  });

  it('maps "missing required posting authority" to MISSING_AUTHORITY', () => {
    const result = handleHiveError(new Error('missing required posting authority'));
    expect(result.code).toBe('MISSING_AUTHORITY');
  });

  it('maps "Duplicate" to DUPLICATE_POST', () => {
    const result = handleHiveError(new Error('Duplicate transaction detected'));
    expect(result.code).toBe('DUPLICATE_POST');
  });

  it('maps unknown error to UNKNOWN_ERROR', () => {
    const result = handleHiveError(new Error('something else'));
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('handles non-Error values', () => {
    const result = handleHiveError('string error');
    expect(result).toBeInstanceOf(HiveError);
    expect(result.code).toBe('UNKNOWN_ERROR');
  });
});
