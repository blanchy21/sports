/**
 * Pure Hive operation builders and validators.
 * No WASM calls — safe for client-side bundling.
 */

import { SPORTS_ARENA_CONFIG } from './platform-config';
import type {
  Beneficiary,
  WaxClaimRewardBalanceOperation,
  WaxCommentOperation,
  WaxCommentOptionsOperation,
  WaxDelegateVestingSharesOperation,
  WaxPostOperation,
  WaxTransferOperation,
  WaxTransferToVestingOperation,
  WaxVoteOperation,
  WaxWithdrawVestingOperation,
} from './hive-types';
import { extractMentions, generatePermlink, stripMarkdown } from './text-utils';

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Validate beneficiary configuration
 */
export function validateBeneficiaries(beneficiaries: Beneficiary[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (beneficiaries.length > 8) {
    errors.push('Maximum 8 beneficiaries allowed');
  }

  let totalWeight = 0;
  const seenAccounts = new Set<string>();

  for (const beneficiary of beneficiaries) {
    if (!beneficiary.account || !/^[a-z][a-z0-9.-]{2,15}$/.test(beneficiary.account)) {
      errors.push(`Invalid account name: ${beneficiary.account || '(empty)'}`);
    }

    if (seenAccounts.has(beneficiary.account)) {
      errors.push(`Duplicate beneficiary account: ${beneficiary.account}`);
    }
    seenAccounts.add(beneficiary.account);

    if (
      !Number.isInteger(beneficiary.weight) ||
      beneficiary.weight < 1 ||
      beneficiary.weight > 10000
    ) {
      errors.push(
        `Invalid weight for ${beneficiary.account}: ${beneficiary.weight} (must be 1-10000)`
      );
    }

    totalWeight += beneficiary.weight;
  }

  if (totalWeight > 10000) {
    errors.push(
      `Total beneficiary weight ${totalWeight} exceeds maximum 10000 (${(totalWeight / 100).toFixed(2)}% > 100%)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate operation data before broadcasting
 */
export function validateOperation(
  operation: WaxVoteOperation | WaxCommentOperation | WaxPostOperation
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!operation.author || operation.author.trim().length === 0) {
    errors.push('Author is required');
  }

  if (!operation.permlink || operation.permlink.trim().length === 0) {
    errors.push('Permlink is required');
  }

  if ('weight' in operation) {
    if (operation.weight < -10000 || operation.weight > 10000) {
      errors.push('Vote weight must be between -10000 and 10000');
    }
  }

  if ('body' in operation) {
    if (!operation.body || operation.body.trim().length === 0) {
      errors.push('Body is required');
    }

    if (operation.body.length > 65535) {
      errors.push('Body is too long (max 65535 characters)');
    }
  }

  if ('title' in operation && operation.title && operation.title.length > 255) {
    errors.push('Title is too long (max 255 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Amount formatters
// ---------------------------------------------------------------------------

/**
 * Format HIVE amount with proper precision (3 decimals)
 */
export function formatHiveAmount(amount: number): string {
  return `${amount.toFixed(3)} HIVE`;
}

/**
 * Format HBD amount with proper precision (3 decimals)
 */
export function formatHBDAmount(amount: number): string {
  return `${amount.toFixed(3)} HBD`;
}

/**
 * Format VESTS amount with proper precision (6 decimals)
 */
export function formatVestsAmount(amount: number): string {
  return `${amount.toFixed(6)} VESTS`;
}

// ---------------------------------------------------------------------------
// Operation builders
// ---------------------------------------------------------------------------

/**
 * Create a vote operation
 */
export function createVoteOperation(voteData: {
  voter: string;
  author: string;
  permlink: string;
  weight: number; // -100 to 100 percentage (negative = downvote)
}): WaxVoteOperation {
  if (voteData.weight < -100 || voteData.weight > 100) {
    throw new Error('Vote weight must be between -100 and 100');
  }

  return {
    voter: voteData.voter,
    author: voteData.author,
    permlink: voteData.permlink,
    weight: Math.round(voteData.weight * 100), // Convert to -10000 to 10000 scale
  };
}

/**
 * Create a comment operation
 */
export function createCommentOperation(commentData: {
  author: string;
  body: string;
  parentAuthor: string;
  parentPermlink: string;
  permlink?: string;
  title?: string;
  jsonMetadata?: string;
  maxAcceptedPayout?: string;
  percentHbd?: number;
  allowVotes?: boolean;
  allowCurationRewards?: boolean;
  extensions?: unknown[];
}): WaxCommentOperation {
  const permlink =
    commentData.permlink ||
    generatePermlink(commentData.title || 'comment', commentData.parentAuthor || undefined);

  let parsedJsonMetadata: Record<string, unknown> = {};
  try {
    parsedJsonMetadata = commentData.jsonMetadata ? JSON.parse(commentData.jsonMetadata) : {};
  } catch {
    /* malformed JSON — use defaults */
  }

  const users = extractMentions(commentData.body, commentData.author);

  const metadata = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: ['sportsblock'],
    ...parsedJsonMetadata,
    ...(users.length > 0 ? { users } : {}),
  };

  return {
    parent_author: commentData.parentAuthor,
    parent_permlink: commentData.parentPermlink,
    author: commentData.author,
    permlink,
    title: commentData.title || '',
    body: commentData.body,
    json_metadata: JSON.stringify(metadata),
    max_accepted_payout: commentData.maxAcceptedPayout || '1000000.000 HBD',
    percent_hbd: commentData.percentHbd || 10000,
    allow_votes: commentData.allowVotes !== false,
    allow_curation_rewards: commentData.allowCurationRewards !== false,
    extensions: commentData.extensions || [],
  };
}

/**
 * Sub-community data for tagging posts to user-created communities
 */
interface SubCommunityData {
  id: string;
  slug: string;
  name: string;
}

/**
 * Create a post operation (posts are comments with specific parent settings)
 */
export function createPostOperation(postData: {
  author: string;
  title: string;
  body: string;
  parentAuthor?: string;
  parentPermlink?: string;
  permlink?: string;
  jsonMetadata?: string;
  sportCategory?: string;
  featuredImage?: string;
  tags?: string[];
  maxAcceptedPayout?: string;
  percentHbd?: number;
  allowVotes?: boolean;
  allowCurationRewards?: boolean;
  extensions?: unknown[];
  subCommunity?: SubCommunityData;
  aiGenerated?: { coverImage?: boolean };
}): WaxPostOperation {
  const permlink = postData.permlink || generatePermlink(postData.title);

  const tags = [
    ...(postData.tags || []),
    SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    'sportsblock',
    ...(postData.subCommunity ? [postData.subCommunity.slug] : []),
  ];

  // Auto-generate plain-text description for SEO / social previews
  const plainText = stripMarkdown(postData.body);
  const description = plainText.length > 160 ? plainText.slice(0, 157) + '...' : plainText;

  // Extract @-mentioned users for cross-platform notifications
  const users = extractMentions(postData.body, postData.author);

  let parsedJsonMetadata: Record<string, unknown> = {};
  try {
    parsedJsonMetadata = postData.jsonMetadata ? JSON.parse(postData.jsonMetadata) : {};
  } catch {
    /* malformed JSON — use defaults */
  }

  const metadata: Record<string, unknown> = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags,
    community: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    description,
    users: users.length > 0 ? users : undefined,
    sport_category: postData.sportCategory,
    image: postData.featuredImage ? [postData.featuredImage] : undefined,
    ...parsedJsonMetadata,
  };

  if (postData.subCommunity) {
    metadata.sub_community = postData.subCommunity.slug;
    metadata.sub_community_id = postData.subCommunity.id;
    metadata.sub_community_name = postData.subCommunity.name;
  }

  // AI tools disclosure per Hive ecosystem convention
  if (postData.aiGenerated) {
    metadata.ai_tools = {
      media_generation: postData.aiGenerated.coverImage || false,
      writing_edit: false,
      research: false,
      translation: false,
      post_draft: false,
      other: false,
    };
  }

  return {
    parent_author: postData.parentAuthor || '',
    parent_permlink: postData.parentPermlink || SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    author: postData.author,
    permlink,
    title: postData.title,
    body: postData.body,
    json_metadata: JSON.stringify(metadata),
    max_accepted_payout: postData.maxAcceptedPayout || '1000000.000 HBD',
    percent_hbd: postData.percentHbd || 10000,
    allow_votes: postData.allowVotes !== false,
    allow_curation_rewards: postData.allowCurationRewards !== false,
    extensions: [],
  };
}

/**
 * Create a comment_options operation for beneficiaries
 */
export function createCommentOptionsOperation(optionsData: {
  author: string;
  permlink: string;
  beneficiaries?: Beneficiary[];
  maxAcceptedPayout?: string;
  percentHbd?: number;
  allowVotes?: boolean;
  allowCurationRewards?: boolean;
}): WaxCommentOptionsOperation {
  const beneficiaries = optionsData.beneficiaries || SPORTS_ARENA_CONFIG.DEFAULT_BENEFICIARIES;

  const validation = validateBeneficiaries(beneficiaries);
  if (!validation.isValid) {
    throw new Error(`Invalid beneficiaries: ${validation.errors.join(', ')}`);
  }

  const sortedBeneficiaries = [...beneficiaries].sort((a, b) => a.account.localeCompare(b.account));

  return {
    author: optionsData.author,
    permlink: optionsData.permlink,
    max_accepted_payout: optionsData.maxAcceptedPayout || '1000000.000 HBD',
    percent_hbd: optionsData.percentHbd || 10000,
    allow_votes: optionsData.allowVotes !== false,
    allow_curation_rewards: optionsData.allowCurationRewards !== false,
    extensions: sortedBeneficiaries.length > 0 ? [[0, { beneficiaries: sortedBeneficiaries }]] : [],
  };
}

// ---------------------------------------------------------------------------
// Transfer & power operations
// ---------------------------------------------------------------------------

/**
 * Create a native HIVE/HBD transfer operation.
 * Pure function — no WASM imports, safe for client bundling.
 */
export function createTransferOperation(data: {
  from: string;
  to: string;
  amount: number;
  currency: 'HIVE' | 'HBD';
  memo?: string;
}): WaxTransferOperation {
  if (data.amount <= 0) {
    throw new Error('Transfer amount must be greater than 0');
  }
  if (data.amount < 0.001) {
    throw new Error('Minimum transfer amount is 0.001');
  }
  if (!data.from || !/^[a-z][a-z0-9.-]{2,15}$/.test(data.from)) {
    throw new Error('Invalid sender username');
  }
  if (!data.to || !/^[a-z][a-z0-9.-]{2,15}$/.test(data.to)) {
    throw new Error('Invalid recipient username');
  }
  if (data.from === data.to) {
    throw new Error('Cannot transfer to yourself');
  }

  const formattedAmount =
    data.currency === 'HIVE' ? formatHiveAmount(data.amount) : formatHBDAmount(data.amount);

  return {
    from: data.from,
    to: data.to,
    amount: formattedAmount,
    memo: data.memo || '',
  };
}

/**
 * Create a Power Up (transfer_to_vesting) operation
 */
export function createPowerUpOperation(powerUpData: {
  from: string;
  to?: string;
  amount: number;
}): WaxTransferToVestingOperation {
  if (powerUpData.amount <= 0) {
    throw new Error('Power up amount must be greater than 0');
  }

  if (powerUpData.amount < 0.001) {
    throw new Error('Minimum power up amount is 0.001 HIVE');
  }

  return {
    from: powerUpData.from,
    to: powerUpData.to || powerUpData.from,
    amount: formatHiveAmount(powerUpData.amount),
  };
}

/**
 * Create a Power Down (withdraw_vesting) operation
 */
export function createPowerDownOperation(powerDownData: {
  account: string;
  vestingShares: number;
}): WaxWithdrawVestingOperation {
  if (powerDownData.vestingShares < 0) {
    throw new Error('Power down amount cannot be negative');
  }

  return {
    account: powerDownData.account,
    vesting_shares: formatVestsAmount(powerDownData.vestingShares),
  };
}

/**
 * Create a Cancel Power Down operation
 */
export function createCancelPowerDownOperation(account: string): WaxWithdrawVestingOperation {
  return {
    account,
    vesting_shares: '0.000000 VESTS',
  };
}

// ---------------------------------------------------------------------------
// Reward claiming & delegation operations
// ---------------------------------------------------------------------------

/**
 * Create a claim_reward_balance operation
 */
export function createClaimRewardsOperation(
  account: string,
  rewardHive: string,
  rewardHbd: string,
  rewardVests: string
): WaxClaimRewardBalanceOperation {
  return {
    account,
    reward_hive: rewardHive,
    reward_hbd: rewardHbd,
    reward_vests: rewardVests,
  };
}

/**
 * Create a delegate_vesting_shares operation
 */
export function createDelegateVestsOperation(
  delegator: string,
  delegatee: string,
  vestingShares: string
): WaxDelegateVestingSharesOperation {
  return {
    delegator,
    delegatee,
    vesting_shares: vestingShares,
  };
}

// ---------------------------------------------------------------------------
// JSON metadata utilities
// ---------------------------------------------------------------------------

/**
 * Utility to parse JSON metadata safely
 */
export function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Utility to format JSON metadata
 */
export function formatJsonMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata);
}

// ---------------------------------------------------------------------------
// Community subscribe/unsubscribe operations (pure — no WASM)
// ---------------------------------------------------------------------------

/**
 * Build a custom_json operation for subscribing to a Hive community.
 * Returns a tuple compatible with broadcastFn.
 */
export function createCommunitySubscribeOperation(
  username: string,
  community: string
): [string, Record<string, unknown>] {
  return [
    'custom_json',
    {
      required_auths: [],
      required_posting_auths: [username],
      id: 'community',
      json: JSON.stringify(['subscribe', { community }]),
    },
  ];
}

/**
 * Build a custom_json operation for unsubscribing from a Hive community.
 * Returns a tuple compatible with broadcastFn.
 */
export function createCommunityUnsubscribeOperation(
  username: string,
  community: string
): [string, Record<string, unknown>] {
  return [
    'custom_json',
    {
      required_auths: [],
      required_posting_auths: [username],
      id: 'community',
      json: JSON.stringify(['unsubscribe', { community }]),
    },
  ];
}
