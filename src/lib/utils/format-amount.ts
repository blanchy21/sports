/**
 * Format a numeric amount to a fixed decimal string.
 * Handles string, number, and undefined inputs.
 */
export function formatAmount(amount: string | number | undefined, precision = 3): string {
  if (!amount && amount !== 0) return (0).toFixed(precision);
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return (0).toFixed(precision);
  return num.toFixed(precision);
}

/** MEDALS balance — locale-formatted, 2 decimal places */
export function formatMedals(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** HIVE reward — 3 decimal places */
export function formatHive(n: number): string {
  return n.toFixed(3);
}

/** Odds multiplier — e.g. "+2.4×" */
export function formatOdds(n: number): string {
  return `+${n.toFixed(1)}×`;
}

/** Leaderboard rank change — e.g. "+1,200 ↑" or "-50 ↓" */
export function formatChange(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toLocaleString()} ${n >= 0 ? '↑' : '↓'}`;
}
