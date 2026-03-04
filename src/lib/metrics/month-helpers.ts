/**
 * Pure date helpers for monthly leaderboard periods.
 * Safe to import from both client and server code (no Prisma dependency).
 */

/** Sentinel sportId for the overall (all-sport) monthly leaderboard. */
export const OVERALL_SPORT_ID = '_overall';

/** Returns "YYYY-MM" for the given date (defaults to now). */
export function getMonthId(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Returns the previous month ID, e.g. "2026-03" → "2026-02". */
export function getPreviousMonthId(monthId: string): string {
  const [year, month] = monthId.split('-').map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** Returns the next month ID, e.g. "2026-02" → "2026-03". */
export function getNextMonthId(monthId: string): string {
  const [year, month] = monthId.split('-').map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
