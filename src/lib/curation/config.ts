/**
 * Curation System Configuration
 *
 * Defines limits, amounts, and eligibility requirements for MEDALS curation.
 */

/** Content type for curation — determines amount and rules */
export type CurationType = 'post' | 'sportsbite';

/** MEDALS awarded per curation by content type */
export const CURATION_MEDALS = {
  post: 100,
  sportsbite: 10,
} as const;

/** Maximum curations a single curator can make per day (shared across all types) */
export const MAX_CURATIONS_PER_DAY = 5;

/** Beneficiary requirements for post curation eligibility */
export const BENEFICIARY_REQUIREMENTS = {
  /** Accounts that satisfy the beneficiary requirement (sportsblock or community account) */
  ACCOUNTS: ['sportsblock', 'hive-115814'] as readonly string[],
  /** Minimum weight (500 = 5% in Hive basis points where 10000 = 100%) */
  MIN_WEIGHT: 500,
} as const;

/** Comment template for on-chain !medals notification */
export function buildCurationComment(curator: string, amount: number): string {
  return `!medals\n\nCurated by @${curator} — ${amount} MEDALS awarded via [SportsBlock](https://sportsblock.app)`;
}

/**
 * Get the MEDALS amount for a given curation type.
 * @deprecated Use CURATION_MEDALS[type] directly. Kept for backward compat.
 */
export const CURATION_MEDALS_AMOUNT = CURATION_MEDALS.post;
