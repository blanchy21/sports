/** Pure date helpers for the DateTimePicker. No side effects, no DOM. */

/** Parse a `YYYY-MM-DDTHH:MM` string into a Date (local time). Returns null on bad input. */
export function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date as `YYYY-MM-DDTHH:MM` (local time). */
export function formatLocalDateTime(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

/** Format a Date for human display: "Mar 15, 2026 at 3:00 PM" */
export function formatDisplayDateTime(d: Date): string {
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, ${year} at ${time}`;
}

/** Get the number of days in a given month (0-indexed month). */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Get the day-of-week (0=Sun) for the first of a month. */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Check if two dates are the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Check if a date is today. */
export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Round minutes down to nearest 5-minute increment. */
export function roundMinutesDown(minutes: number): number {
  return Math.floor(minutes / 5) * 5;
}

/** Build a Date from year, month, day, hour, minute. */
export function buildDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  return new Date(year, month, day, hour, minute);
}
