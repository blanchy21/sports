/**
 * Curation Eligibility Checks
 *
 * Determines whether a post qualifies for MEDALS curation.
 */

import { BENEFICIARY_REQUIREMENTS } from './config';
import { SPORTS_ARENA_CONFIG } from '@/lib/hive-workerbee/client';

interface Beneficiary {
  account: string;
  weight: number;
}

/**
 * Check if a post has the required sportsblock beneficiary.
 */
export function hasSportsblockBeneficiary(
  beneficiaries: Beneficiary[] | undefined | null
): boolean {
  if (!beneficiaries || !Array.isArray(beneficiaries)) return false;

  return beneficiaries.some(
    (b) =>
      b.account === BENEFICIARY_REQUIREMENTS.ACCOUNT &&
      b.weight >= BENEFICIARY_REQUIREMENTS.MIN_WEIGHT
  );
}

/**
 * Full eligibility check for a post. Returns reason if ineligible.
 */
export function checkCurationEligibility(post: {
  beneficiaries?: Beneficiary[] | null;
  category?: string;
  parent_author?: string;
  depth?: number;
}): { eligible: boolean; reason?: string } {
  // Must be a root post (not a comment/reply)
  if (post.parent_author && post.parent_author !== '') {
    return { eligible: false, reason: 'Comments/replies are not eligible for curation' };
  }
  if (post.depth && post.depth > 0) {
    return { eligible: false, reason: 'Comments/replies are not eligible for curation' };
  }

  // Must be in the sportsblock community
  const community = post.category || '';
  if (community !== SPORTS_ARENA_CONFIG.COMMUNITY_ID) {
    return { eligible: false, reason: 'Post is not in the SportsBlock community' };
  }

  // Must have the sportsblock beneficiary
  if (!hasSportsblockBeneficiary(post.beneficiaries)) {
    return {
      eligible: false,
      reason: `Post does not have the required ${BENEFICIARY_REQUIREMENTS.ACCOUNT} beneficiary (${BENEFICIARY_REQUIREMENTS.MIN_WEIGHT / 100}%)`,
    };
  }

  return { eligible: true };
}
