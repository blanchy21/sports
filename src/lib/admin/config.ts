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

/** Check admin access with auth type verification (defense-in-depth) */
export function requireAdmin(user: { username: string; authType?: string } | null): boolean {
  if (!user) return false;
  if (user.authType !== 'hive') return false;
  return ADMIN_ACCOUNTS.includes(user.username);
}
