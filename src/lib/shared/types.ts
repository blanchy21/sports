// Hive-specific TypeScript types

export interface HiveAccount {
  id: number;
  name: string;
  owner: {
    weight_threshold: number;
    account_auths: Array<[string, number]>;
    key_auths: Array<[string, number]>;
  };
  active: {
    weight_threshold: number;
    account_auths: Array<[string, number]>;
    key_auths: Array<[string, number]>;
  };
  posting: {
    weight_threshold: number;
    account_auths: Array<[string, number]>;
    key_auths: Array<[string, number]>;
  };
  memo_key: string;
  json_metadata: string;
  posting_json_metadata: string;
  proxy: string;
  last_owner_update: string;
  last_account_update: string;
  created: string;
  mined: boolean;
  recovery_account: string;
  reset_account: string;
  last_account_recovery: string;
  comment_count: number;
  lifetime_vote_count: number;
  post_count: number;
  can_vote: boolean;
  voting_power: number;
  last_vote_time: string;
  balance: string;
  savings_balance: string;
  hbd_balance: string;
  hbd_seconds: string;
  hbd_seconds_last_update: string;
  hbd_last_interest_payment: string;
  savings_hbd_balance: string;
  savings_hbd_seconds: string;
  savings_hbd_seconds_last_update: string;
  savings_hbd_last_interest_payment: string;
  savings_withdraw_requests: number;
  vesting_shares: string;
  vesting_withdraw_rate: string;
  next_vesting_withdrawal: string;
  withdrawn: string;
  to_withdraw: string;
  withdraw_routes: number;
  curation_rewards: string;
  posting_rewards: string;
  proxied_vsf_votes: Array<[string, number]>;
  witnesses_voted_for: number;
  average_bandwidth: string;
  lifetime_bandwidth: string;
  lifetime_bandwidth_average: string;
  last_bandwidth_update: string;
  last_market_bandwidth_update: string;
  last_post: string;
  last_root_post: string;
  post_bandwidth: string;
  new_average_bandwidth: string;
  new_average_market_bandwidth: string;
  vesting_balance: string;
  reputation: string;
  transfer_history: string[];
  market_history: string[];
  post_history: string[];
  vote_history: string[];
  other_history: string[];
  witness_votes: string[];
  tags_usage: string[];
  guest_bloggers: string[];
  blog_category: string;
  team: string[];
  can_receive_notifications: boolean;
  can_receive_curation_rewards: boolean;
  can_receive_author_rewards: boolean;
  can_receive_benefactor_rewards: boolean;
  can_receive_transfer_notifications: boolean;
  can_receive_mention_notifications: boolean;
  can_receive_vote_notifications: boolean;
  can_receive_comment_notifications: boolean;
  can_receive_reblog_notifications: boolean;
  can_receive_follow_notifications: boolean;
  can_receive_other_notifications: boolean;
}

export interface HivePost {
  id: number;
  author: string;
  permlink: string;
  category: string;
  parent_author: string;
  parent_permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  last_update: string;
  created: string;
  active: string;
  last_payout: string;
  depth: number;
  children: number;
  net_rshares: string;
  abs_rshares: string;
  vote_rshares: string;
  children_abs_rshares: string;
  cashout_time: string;
  max_cashout_time: string;
  total_vote_weight: string;
  reward_weight: number;
  total_payout_value: string;
  curator_payout_value: string;
  author_rewards: string;
  net_votes: number;
  root_author: string;
  root_permlink: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_replies: boolean;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  beneficiaries: Array<{
    account: string;
    weight: number;
  }>;
  url: string;
  root_title: string;
  pending_payout_value: string;
  total_pending_payout_value: string;
  active_votes: Array<{
    voter: string;
    weight: number;
    rshares: string;
    percent: number;
    reputation: string;
    time: string;
  }>;
  replies: string[];
  author_reputation: string;
  promoted: string;
  body_length: number;
  reblogged_by: string[];
  img_url?: string;
  community?: string;
  community_title?: string;
  community_roles?: string[];
  community_blacklists?: string[];
  blacklists?: string[];
  tags?: string[];
  app?: string;
  sport_category?: string;
}

export interface HiveComment {
  id: number;
  author: string;
  permlink: string;
  category: string;
  parent_author: string;
  parent_permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  last_update: string;
  created: string;
  active: string;
  last_payout: string;
  depth: number;
  children: number;
  net_rshares: string;
  abs_rshares: string;
  vote_rshares: string;
  children_abs_rshares: string;
  cashout_time: string;
  max_cashout_time: string;
  total_vote_weight: string;
  reward_weight: number;
  total_payout_value: string;
  curator_payout_value: string;
  author_rewards: string;
  net_votes: number;
  root_author: string;
  root_permlink: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_replies: boolean;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  url: string;
  root_title: string;
  pending_payout_value: string;
  total_pending_payout_value: string;
  active_votes: Array<{
    voter: string;
    weight: number;
    rshares: string;
    percent: number;
    reputation: string;
    time: string;
  }>;
  replies: string[];
  author_reputation: string;
  promoted: string;
  body_length: number;
  reblogged_by: string[];
}

export interface HiveVote {
  voter: string;
  weight: number;
  rshares: string;
  percent: number;
  reputation: string;
  time: string;
}

export interface HiveTransaction {
  ref_block_num: number;
  ref_block_prefix: number;
  expiration: string;
  operations: Array<[string, Record<string, unknown>]>;
  extensions: Array<[number, Record<string, unknown>]>;
  signatures: string[];
}

export interface HivePostMetadata {
  app?: string;
  format?: string;
  tags?: string[];
  community?: string;
  sport_category?: string;
  image?: string[];
  links?: string[];
  users?: string[];
}

export interface HiveProfileMetadata {
  profile?: {
    name?: string;
    about?: string;
    location?: string;
    website?: string;
    cover_image?: string;
    profile_image?: string;
    version?: number;
  };
}

export interface HiveResourceCredit {
  account: string;
  rc_manabar: {
    current_mana: string;
    last_update_time: number;
  };
  max_rc: string;
  delegated_rc: string;
  received_delegated_rc: string;
}

export interface HiveKeychainRequest {
  type: string;
  id: string;
  jsonrpc: string;
  method: string;
  params: Record<string, unknown>;
}

export interface HiveKeychainResponse {
  id: string;
  jsonrpc: string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  };
}

// Sportsblock specific types
export interface SportsblockPost extends HivePost {
  /** Discriminant for Post union types */
  postType: 'sportsblock';
  sportCategory?: string;
  /** @deprecated Use postType === 'sportsblock' instead */
  isSportsblockPost: true;
}

/**
 * Processed user account data returned from the account API.
 * This is the parsed/normalized version of HiveAccount with computed fields.
 */
export interface UserAccountData {
  username: string;
  reputation: number;
  reputationFormatted: string;
  liquidHiveBalance: number;
  liquidHbdBalance: number;
  savingsHiveBalance: number;
  savingsHbdBalance: number;
  hiveBalance: number;
  hbdBalance: number;
  hivePower: number;
  resourceCredits: number;
  resourceCreditsFormatted: string;
  hasEnoughRC: boolean;
  savingsApr?: number;
  pendingWithdrawals?: Array<{
    id: string;
    amount: string;
    to: string;
    memo: string;
    requestId: number;
    from: string;
    timestamp: string;
  }>;
  profile: {
    name?: string;
    about?: string;
    location?: string;
    website?: string;
    coverImage?: string;
    profileImage?: string;
  };
  stats: {
    postCount: number;
    commentCount: number;
    voteCount: number;
    followers?: number;
    following?: number;
  };
  createdAt: Date;
  lastPost?: Date;
  lastVote?: Date;
  canVote: boolean;
  votingPower: number;
}

export interface HiveAuthUser {
  username: string;
  postingKey?: string; // Deprecated: wallet manages keys
  activeKey?: string; // Deprecated: wallet manages keys
  isAuthenticated: boolean;
  /** Processed account data from the API (not raw HiveAccount) */
  account?: UserAccountData;
  resourceCredits?: HiveResourceCredit;
  // Wallet properties
  provider?: string; // 'keychain' | 'hivesigner'
  sessionId?: string; // Session identifier
}

// ============================================================================
// Type Guards for Runtime Validation
// ============================================================================

/**
 * Type guard to check if a value is a valid HivePost
 */
export function isHivePost(value: unknown): value is HivePost {
  if (!value || typeof value !== 'object') return false;
  const post = value as Record<string, unknown>;
  return (
    typeof post.author === 'string' &&
    typeof post.permlink === 'string' &&
    typeof post.title === 'string' &&
    typeof post.body === 'string'
  );
}

/**
 * Type guard to check if a value is a valid HiveComment
 */
export function isHiveComment(value: unknown): value is HiveComment {
  if (!value || typeof value !== 'object') return false;
  const comment = value as Record<string, unknown>;
  return (
    typeof comment.author === 'string' &&
    typeof comment.permlink === 'string' &&
    typeof comment.body === 'string' &&
    typeof comment.parent_author === 'string'
  );
}

/**
 * Type guard to check if a value is a valid HiveAccount
 */
export function isHiveAccount(value: unknown): value is HiveAccount {
  if (!value || typeof value !== 'object') return false;
  const account = value as Record<string, unknown>;
  return (
    typeof account.name === 'string' &&
    typeof account.balance === 'string' &&
    typeof account.reputation === 'string'
  );
}

// ============================================================================
// Type-Safe Transformation Functions
// ============================================================================

/**
 * Safely cast an array of unknown values to HivePost array,
 * filtering out invalid entries.
 */
export function toHivePosts(data: unknown): HivePost[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isHivePost);
}

/**
 * Safely cast an array of unknown values to HiveComment array,
 * filtering out invalid entries.
 */
export function toHiveComments(data: unknown): HiveComment[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isHiveComment);
}

/**
 * Convert a HivePost to SportsblockPost by adding required fields
 */
export function toSportsblockPost(post: HivePost, sportCategory?: string | null): SportsblockPost {
  return {
    ...post,
    postType: 'sportsblock',
    sportCategory: sportCategory ?? undefined,
    isSportsblockPost: true,
  };
}

/**
 * Safely convert an array of unknown values to SportsblockPost array.
 * Filters to valid HivePosts first, then transforms to SportsblockPost.
 */
export function toSportsblockPosts(
  data: unknown,
  getSportCategory?: (post: HivePost) => string | null
): SportsblockPost[] {
  const posts = toHivePosts(data);
  return posts.map((post) => toSportsblockPost(post, getSportCategory?.(post)));
}
