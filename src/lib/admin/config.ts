/**
 * Admin Configuration
 *
 * Shared admin account list and access helpers.
 */

/** Accounts with admin dashboard access */
export const ADMIN_ACCOUNTS = ['sportsblock'];

/** Check if a username has admin access */
export function isAdminAccount(username: string): boolean {
  return ADMIN_ACCOUNTS.includes(username);
}
