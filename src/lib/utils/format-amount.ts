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
