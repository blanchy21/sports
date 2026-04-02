/**
 * Curation System Configuration
 *
 * Defines limits, amounts, and eligibility requirements for MEDALS curation.
 */

/** MEDALS awarded per curation (matches curator vote reward in Year 1-3) */
export const CURATION_MEDALS_AMOUNT = 100;

/** Maximum curations a single curator can make per day */
export const MAX_CURATIONS_PER_DAY = 5;

/** Beneficiary requirements for curation eligibility */
export const BENEFICIARY_REQUIREMENTS = {
  /** Account that must appear in beneficiaries */
  ACCOUNT: 'sportsblock',
  /** Minimum weight (500 = 5% in Hive basis points where 10000 = 100%) */
  MIN_WEIGHT: 500,
} as const;

/** Comment template for on-chain !medals notification */
export function buildCurationComment(curator: string, amount: number): string {
  return `!medals\n\nCurated by @${curator} — ${amount} MEDALS awarded via [SportsBlock](https://sportsblock.app)`;
}
