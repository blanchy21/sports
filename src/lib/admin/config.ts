/**
 * Admin Configuration
 *
 * Shared admin account list and access helpers.
 */

/** Accounts with admin dashboard access */
export const ADMIN_ACCOUNTS: readonly string[] = process.env.ADMIN_ACCOUNTS
  ? process.env.ADMIN_ACCOUNTS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : ['sportsblock', 'blanchy', 'niallon11'];

/** Check if a username has admin access */
export function isAdminAccount(username: string): boolean {
  return ADMIN_ACCOUNTS.includes(username);
}
