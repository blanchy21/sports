/**
 * Hive API Response Validation Schemas
 *
 * Zod schemas for validating Hive blockchain API responses
 * to ensure type safety at runtime.
 */

import { z } from 'zod';

// ============================================================================
// Account Schemas
// ============================================================================

/**
 * Profile metadata embedded in json_metadata
 */
export const hiveProfileMetadataSchema = z
  .object({
    name: z.string().optional(),
    about: z.string().optional(),
    location: z.string().optional(),
    website: z.string().optional(),
    cover_image: z.string().optional(),
    profile_image: z.string().optional(),
    version: z.number().optional(),
  })
  .passthrough();

/**
 * Raw Hive account from get_accounts API
 */
export const hiveRawAccountSchema = z
  .object({
    name: z.string(),
    reputation: z.union([z.string(), z.number()]),
    balance: z.string(),
    savings_balance: z.string(),
    hbd_balance: z.string(),
    savings_hbd_balance: z.string(),
    vesting_shares: z.string(),
    delegated_vesting_shares: z.string().optional(),
    received_vesting_shares: z.string().optional(),
    vesting_withdraw_rate: z.string().optional(),
    voting_power: z.number().optional(),
    can_vote: z.boolean().optional(),
    last_vote_time: z.string().optional(),
    last_post: z.string().optional(),
    post_count: z.number().optional(),
    comment_count: z.number().optional(),
    lifetime_vote_count: z.number().optional(),
    created: z.string(),
    json_metadata: z.string().optional(),
    posting_json_metadata: z.string().optional(),
  })
  .passthrough();

/**
 * Processed user account data (normalized from raw account)
 */
export const userAccountDataSchema = z.object({
  username: z.string(),
  reputation: z.number(),
  reputationFormatted: z.string(),
  liquidHiveBalance: z.number(),
  liquidHbdBalance: z.number(),
  savingsHiveBalance: z.number(),
  savingsHbdBalance: z.number(),
  hiveBalance: z.number(),
  hbdBalance: z.number(),
  hivePower: z.number(),
  resourceCredits: z.number(),
  resourceCreditsFormatted: z.string(),
  hasEnoughRC: z.boolean(),
  savingsApr: z.number().optional(),
  pendingWithdrawals: z
    .array(
      z.object({
        id: z.string(),
        amount: z.string(),
        to: z.string(),
        memo: z.string(),
        requestId: z.number(),
        from: z.string(),
        timestamp: z.string(),
      })
    )
    .optional(),
  profile: z.object({
    name: z.string().optional(),
    about: z.string().optional(),
    location: z.string().optional(),
    website: z.string().optional(),
    coverImage: z.string().optional(),
    profileImage: z.string().optional(),
  }),
  stats: z.object({
    postCount: z.number(),
    commentCount: z.number(),
    voteCount: z.number(),
    followers: z.number().optional(),
    following: z.number().optional(),
  }),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  lastPost: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional(),
  lastVote: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional(),
  canVote: z.boolean(),
  votingPower: z.number(),
});

// ============================================================================
// Post Schemas
// ============================================================================

/**
 * Active vote on a post
 */
export const hiveActiveVoteSchema = z
  .object({
    voter: z.string(),
    weight: z.number(),
    rshares: z.union([z.string(), z.number()]),
    percent: z.number().optional(),
    reputation: z.union([z.string(), z.number()]).optional(),
    time: z.string().optional(),
  })
  .passthrough();

/**
 * Raw Hive post from get_content or get_discussions APIs
 */
export const hiveRawPostSchema = z
  .object({
    author: z.string(),
    permlink: z.string(),
    title: z.string(),
    body: z.string(),
    category: z.string().optional(),
    parent_author: z.string().optional(),
    parent_permlink: z.string().optional(),
    json_metadata: z.string().optional(),
    created: z.string(),
    last_update: z.string().optional(),
    active: z.string().optional(),
    depth: z.number().optional(),
    children: z.number().optional(),
    net_votes: z.number(),
    net_rshares: z.union([z.string(), z.number()]).optional(),
    pending_payout_value: z.string().optional(),
    total_payout_value: z.string().optional(),
    curator_payout_value: z.string().optional(),
    active_votes: z.array(hiveActiveVoteSchema).optional(),
    author_reputation: z.union([z.string(), z.number()]).optional(),
    beneficiaries: z
      .array(
        z.object({
          account: z.string(),
          weight: z.number(),
        })
      )
      .optional(),
    community: z.string().optional(),
    community_title: z.string().optional(),
  })
  .passthrough();

/**
 * Post metadata from json_metadata field
 */
export const hivePostMetadataSchema = z
  .object({
    app: z.string().optional(),
    format: z.string().optional(),
    tags: z.array(z.string()).optional(),
    community: z.string().optional(),
    sport_category: z.string().optional(),
    image: z.array(z.string()).optional(),
    links: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
  })
  .passthrough();

// ============================================================================
// Dynamic Properties Schema
// ============================================================================

/**
 * Global dynamic properties from get_dynamic_global_properties
 */
export const hiveDynamicPropertiesSchema = z
  .object({
    head_block_number: z.number(),
    head_block_id: z.string(),
    time: z.string(),
    current_witness: z.string().optional(),
    total_vesting_fund_hive: z.string().optional(),
    total_vesting_shares: z.string().optional(),
    hbd_interest_rate: z.number().optional(),
    virtual_supply: z.string().optional(),
    current_supply: z.string().optional(),
  })
  .passthrough();

// ============================================================================
// Resource Credits Schema
// ============================================================================

/**
 * Resource credits from rc_api.find_rc_accounts
 */
export const hiveResourceCreditsSchema = z
  .object({
    account: z.string(),
    rc_manabar: z.object({
      current_mana: z.union([z.string(), z.number()]),
      last_update_time: z.number(),
    }),
    max_rc: z.union([z.string(), z.number()]),
    delegated_rc: z.union([z.string(), z.number()]).optional(),
    received_delegated_rc: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Account summary API response
 */
export const accountSummaryResponseSchema = z.object({
  success: z.literal(true),
  account: userAccountDataSchema,
});

/**
 * Posts API response
 */
export const postsResponseSchema = z.object({
  success: z.literal(true),
  posts: z.array(hiveRawPostSchema),
  hasMore: z.boolean().optional(),
  nextCursor: z.string().optional(),
  count: z.number().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type HiveRawAccount = z.infer<typeof hiveRawAccountSchema>;
export type HiveRawPost = z.infer<typeof hiveRawPostSchema>;
export type HivePostMetadata = z.infer<typeof hivePostMetadataSchema>;
export type HiveDynamicProperties = z.infer<typeof hiveDynamicPropertiesSchema>;
export type HiveResourceCredits = z.infer<typeof hiveResourceCreditsSchema>;
export type ValidatedUserAccountData = z.infer<typeof userAccountDataSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Safely parse and validate account data from API response
 */
export function validateAccountData(data: unknown): ValidatedUserAccountData | null {
  const result = userAccountDataSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Account data validation failed:', result.error.issues);
  return null;
}

/**
 * Safely parse and validate post data from API response
 */
export function validatePostData(data: unknown): HiveRawPost | null {
  const result = hiveRawPostSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Post data validation failed:', result.error.issues);
  return null;
}

/**
 * Safely parse post metadata JSON string
 */
export function parsePostMetadata(jsonMetadata: string): HivePostMetadata | null {
  try {
    const parsed = JSON.parse(jsonMetadata || '{}');
    const result = hivePostMetadataSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate dynamic properties response
 */
export function validateDynamicProperties(data: unknown): HiveDynamicProperties | null {
  const result = hiveDynamicPropertiesSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Dynamic properties validation failed:', result.error.issues);
  return null;
}
