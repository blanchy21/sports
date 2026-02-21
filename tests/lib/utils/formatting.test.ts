/** @jest-environment node */

import {
  formatDate,
  formatTime,
  formatReadTime,
  truncateText,
  slugify,
  formatUSD,
  formatCrypto,
  formatPercentage,
  formatLargeNumber,
  formatCryptoWithUSD,
} from '@/lib/utils/formatting';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-15T12:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('formatDate', () => {
  it('returns "Just now" for < 1 hour ago', () => {
    const thirtyMinAgo = new Date('2026-01-15T11:30:00Z');
    expect(formatDate(thirtyMinAgo)).toBe('Just now');
  });

  it('returns "5h ago" for 5 hours ago', () => {
    const fiveHoursAgo = new Date('2026-01-15T07:00:00Z');
    expect(formatDate(fiveHoursAgo)).toBe('5h ago');
  });

  it('returns "3d ago" for 3 days ago', () => {
    const threeDaysAgo = new Date('2026-01-12T12:00:00Z');
    expect(formatDate(threeDaysAgo)).toBe('3d ago');
  });

  it('returns formatted date for > 7 days ago', () => {
    const twoWeeksAgo = new Date('2026-01-01T12:00:00Z');
    const result = formatDate(twoWeeksAgo);
    // Should contain month, day, year (UTC formatting)
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });
});

describe('formatTime', () => {
  it('returns formatted time string', () => {
    const date = new Date('2026-01-15T14:30:00Z');
    const result = formatTime(date);
    // Should contain minute portion "30" and AM/PM indicator
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
  });
});

describe('formatReadTime', () => {
  it('returns "1 min read" for 200 words', () => {
    expect(formatReadTime(200)).toBe('1 min read');
  });

  it('returns "3 min read" for 600 words', () => {
    expect(formatReadTime(600)).toBe('3 min read');
  });

  it('rounds up partial minutes', () => {
    expect(formatReadTime(250)).toBe('2 min read');
  });
});

describe('truncateText', () => {
  it('returns short text unchanged', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates long text with "..."', () => {
    expect(truncateText('hello world this is long', 10)).toBe('hello worl...');
  });
});

describe('slugify', () => {
  it('converts normal text to lowercase hyphenated slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! @World #2024')).toBe('hello-world-2024');
  });

  it('collapses multiple separators', () => {
    expect(slugify('hello   world---test')).toBe('hello-world-test');
  });
});

describe('formatUSD', () => {
  it('formats 1234.56 as "$1,234.56"', () => {
    expect(formatUSD(1234.56)).toBe('$1,234.56');
  });

  it('respects custom decimals', () => {
    expect(formatUSD(1234.5, 0)).toBe('$1,235');
  });
});

describe('formatCrypto', () => {
  it('formats amount with symbol', () => {
    expect(formatCrypto(1.234, 'HIVE')).toBe('1.234 HIVE');
  });

  it('respects custom decimals', () => {
    expect(formatCrypto(1.2, 'HBD', 2)).toBe('1.20 HBD');
  });
});

describe('formatPercentage', () => {
  it('formats percentage with default 1 decimal', () => {
    expect(formatPercentage(15.5)).toBe('15.5%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercentage(15.555, 2)).toBe('15.56%');
  });
});

describe('formatLargeNumber', () => {
  it('formats thousands with K suffix', () => {
    expect(formatLargeNumber(1500)).toBe('1.5K');
  });

  it('formats millions with M suffix', () => {
    expect(formatLargeNumber(1500000)).toBe('1.5M');
  });

  it('formats billions with B suffix', () => {
    expect(formatLargeNumber(1500000000)).toBe('1.5B');
  });

  it('formats small numbers without suffix', () => {
    expect(formatLargeNumber(500)).toBe('500.0');
  });
});

describe('formatCryptoWithUSD', () => {
  it('combines crypto and USD format', () => {
    const result = formatCryptoWithUSD(10, 'HIVE', 0.5);
    expect(result).toBe('10.000 HIVE ($5.00)');
  });
});
