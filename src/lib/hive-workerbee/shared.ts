/**
 * Shared types, constants, and pure operation builders.
 *
 * IMPORTANT: This file must have ZERO imports from any WASM-contaminated module
 * (client.ts, wax-helpers.ts, etc.). It is safe for client-side bundling.
 *
 * Server-side files re-export these items for backward compatibility.
 */

// ---------------------------------------------------------------------------
// Platform config
// ---------------------------------------------------------------------------

export const SPORTS_ARENA_CONFIG = {
  APP_NAME: 'sportsblock',
  APP_VERSION: '1.0.0',
  COMMUNITY_ID: 'hive-115814',
  COMMUNITY_NAME: 'sportsblock',
  TAGS: ['sportsblock', 'hive-115814'],
  REWARDS_ACCOUNT: 'sp-blockrewards',
  DEFAULT_BENEFICIARIES: [
    {
      account: 'sportsblock',
      weight: 500, // 5% to platform (per MEDALS whitepaper v4)
    },
  ],
};

// Authors muted at the platform level — their posts and comments are hidden from all feeds.
// Add Hive usernames (without @) to block spam or abusive accounts.
export const MUTED_AUTHORS: readonly string[] = ['kgakakillerg', 'heimindanger'];

// ---------------------------------------------------------------------------
// Wax operation types
// ---------------------------------------------------------------------------

export interface WaxVoteOperation {
  voter: string;
  author: string;
  permlink: string;
  weight: number;
}

export interface WaxCommentOperation {
  parent_author: string;
  parent_permlink: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  extensions?: unknown[];
}

// Posts are essentially comments with specific parent settings
export type WaxPostOperation = WaxCommentOperation;

export interface WaxCommentOptionsOperation {
  author: string;
  permlink: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  extensions: Array<[0, { beneficiaries: Array<{ account: string; weight: number }> }]>;
}

export interface Beneficiary {
  account: string;
  weight: number; // 0-10000 (basis points, so 2000 = 20%)
}

export interface WaxTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  blockNum?: number;
  trxNum?: number;
}

export interface WaxTransferToVestingOperation {
  from: string;
  to: string;
  amount: string; // e.g., "10.000 HIVE"
}

export interface WaxWithdrawVestingOperation {
  account: string;
  vesting_shares: string; // e.g., "10000.000000 VESTS"
}

// ---------------------------------------------------------------------------
// Wax operation builders (pure — no WASM calls)
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
 * Format HIVE amount with proper precision (3 decimals)
 */
export function formatHiveAmount(amount: number): string {
  return `${amount.toFixed(3)} HIVE`;
}

/**
 * Format VESTS amount with proper precision (6 decimals)
 */
export function formatVestsAmount(amount: number): string {
  return `${amount.toFixed(6)} VESTS`;
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

/**
 * Generate a unique permlink for posts/comments
 */
export function generatePermlink(title: string): string {
  const basePermlink = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${basePermlink}-${timestamp}-${randomSuffix}`;
}

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
  const permlink = commentData.permlink || generatePermlink(commentData.title || 'comment');

  const metadata = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: ['sportsblock'],
    ...(commentData.jsonMetadata ? JSON.parse(commentData.jsonMetadata) : {}),
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
}): WaxPostOperation {
  const permlink = postData.permlink || generatePermlink(postData.title);

  const tags = [
    ...(postData.tags || []),
    SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    'sportsblock',
    ...(postData.subCommunity ? [postData.subCommunity.slug] : []),
  ];

  const metadata: Record<string, unknown> = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags,
    community: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
    sport_category: postData.sportCategory,
    image: postData.featuredImage ? [postData.featuredImage] : undefined,
    ...(postData.jsonMetadata ? JSON.parse(postData.jsonMetadata) : {}),
  };

  if (postData.subCommunity) {
    metadata.sub_community = postData.subCommunity.slug;
    metadata.sub_community_id = postData.subCommunity.id;
    metadata.sub_community_name = postData.subCommunity.name;
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
    if (operation.weight < 0 || operation.weight > 10000) {
      errors.push('Vote weight must be between 0 and 10000');
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
// Voting types
// ---------------------------------------------------------------------------

export interface VoteResult {
  success: boolean;
  transactionId?: string;
  confirmed?: boolean;
  error?: string;
}

export interface VoteData {
  voter: string;
  author: string;
  permlink: string;
  weight: number; // 0-100 percentage
}

export interface HiveVote {
  voter: string;
  weight: number;
  rshares: string;
  percent: number;
  reputation: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Realtime event types
// ---------------------------------------------------------------------------

export interface RealtimePostEvent {
  type: 'new_post';
  data: {
    author: string;
    permlink: string;
    title: string;
    body: string;
    created: string;
    sportCategory?: string;
  };
}

export interface RealtimeVoteEvent {
  type: 'new_vote';
  data: {
    voter: string;
    author: string;
    permlink: string;
    weight: number;
    timestamp: string;
  };
}

export interface RealtimeCommentEvent {
  type: 'new_comment';
  data: {
    author: string;
    permlink: string;
    parentAuthor: string;
    parentPermlink: string;
    body: string;
    created: string;
  };
}

export type RealtimeEvent = RealtimePostEvent | RealtimeVoteEvent | RealtimeCommentEvent;

export type RealtimeEventCallback = (event: RealtimeEvent) => void;

// ---------------------------------------------------------------------------
// Sportsbites config, types, and pure helpers
// ---------------------------------------------------------------------------

export const SPORTSBITES_CONFIG = {
  PARENT_AUTHOR: 'sportsbites',
  MAX_CHARS: 280,
  DEFAULT_TAGS: ['sportsblock', 'sportsbites', 'microblog'],
  CONTENT_TYPE: 'sportsbite',
  ROLLING_WINDOW_DAYS: 7,
  COMMUNITY_ID: 'hive-115814',
};

export type ReactionEmoji = 'fire' | 'shocked' | 'laughing' | 'angry' | 'eyes' | 'thumbs_down';

export const REACTION_EMOJIS: Record<ReactionEmoji, string> = {
  fire: '\u{1F525}',
  shocked: '\u{1F631}',
  laughing: '\u{1F602}',
  angry: '\u{1F624}',
  eyes: '\u{1F440}',
  thumbs_down: '\u{1F44E}',
} as const;

export interface ReactionCounts {
  fire: number;
  shocked: number;
  laughing: number;
  angry: number;
  eyes: number;
  thumbs_down: number;
  total: number;
}

export interface PollDefinition {
  question: string;
  options: [string, string];
}

export interface PollResults {
  option0Count: number;
  option1Count: number;
  totalVotes: number;
}

export interface Sportsbite {
  id: string;
  author: string;
  permlink: string;
  body: string;
  created: string;
  net_votes: number;
  children: number;
  pending_payout_value: string;
  active_votes: Array<{
    voter: string;
    weight: number;
    percent: number;
    time: string;
  }>;
  sportCategory?: string;
  images?: string[];
  gifs?: string[];
  author_reputation?: string;
  source?: 'hive' | 'soft';
  softId?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  poll?: PollDefinition;
}

export interface SportsbiteApiResponse {
  success: boolean;
  sportsbites: Sportsbite[];
  hasMore: boolean;
  nextCursor?: string;
  count: number;
  error?: string;
}

export interface PublishSportsbiteData {
  body: string;
  author: string;
  sportCategory?: string;
  images?: string[];
  gifs?: string[];
  poll?: PollDefinition;
}

export interface PublishSportsbiteResult {
  success: boolean;
  permlink?: string;
  author?: string;
  url?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Sportsbites validation & helpers
// ---------------------------------------------------------------------------

export function validateSportsbiteContent(body: string): {
  isValid: boolean;
  errors: string[];
  charCount: number;
} {
  const errors: string[] = [];
  const charCount = body.length;

  if (!body || body.trim().length === 0) {
    errors.push('Content is required');
  }

  if (charCount > SPORTSBITES_CONFIG.MAX_CHARS) {
    errors.push(`Content exceeds ${SPORTSBITES_CONFIG.MAX_CHARS} characters (${charCount})`);
  }

  return { isValid: errors.length === 0, errors, charCount };
}

/** Deterministic permlink for a given day: `sportsbites-daily-YYYY-MM-DD` */
export function getContainerPermlink(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `sportsbites-daily-${yyyy}-${mm}-${dd}`;
}

/** Returns container permlinks for the rolling window (newest first). */
export function getRollingContainerPermlinks(
  days: number = SPORTSBITES_CONFIG.ROLLING_WINDOW_DAYS
): string[] {
  const permlinks: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    permlinks.push(getContainerPermlink(d));
  }
  return permlinks;
}

/** Human-readable date for container titles. */
export function formatContainerDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function buildSportsbiteMetadata(data: PublishSportsbiteData): string {
  const metadata: Record<string, unknown> = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: [...SPORTSBITES_CONFIG.DEFAULT_TAGS, ...(data.sportCategory ? [data.sportCategory] : [])],
    content_type: SPORTSBITES_CONFIG.CONTENT_TYPE,
    sport_category: data.sportCategory,
    images: data.images,
    gifs: data.gifs,
  };

  if (data.poll) {
    metadata.poll = data.poll;
  }

  return JSON.stringify(metadata);
}

export function createSportsbiteOperation(data: PublishSportsbiteData) {
  if (MUTED_AUTHORS.includes(data.author)) {
    throw new Error('This account has been muted and cannot post sportsbites.');
  }

  const validation = validateSportsbiteContent(data.body);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const permlink = generatePermlink('bite');
  const todayPermlink = getContainerPermlink();

  let fullBody = data.body;
  if (data.images && data.images.length > 0) {
    fullBody += '\n\n' + data.images.map((img) => `![](${img})`).join('\n');
  }
  if (data.gifs && data.gifs.length > 0) {
    fullBody += '\n\n' + data.gifs.map((gif) => `![](${gif})`).join('\n');
  }

  return createCommentOperation({
    author: data.author,
    body: fullBody,
    parentAuthor: SPORTSBITES_CONFIG.PARENT_AUTHOR,
    parentPermlink: todayPermlink,
    permlink,
    title: '',
    jsonMetadata: buildSportsbiteMetadata(data),
  });
}

export function transformToSportsbite(item: unknown): Sportsbite | null {
  const post = item as Record<string, unknown>;
  if (!post || !post.author) return null;

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse((post.json_metadata as string) || '{}');
  } catch {
    metadata = {};
  }

  if (metadata.content_type !== 'sportsbite') return null;

  const rawPoll = metadata.poll as { question?: string; options?: unknown } | undefined;
  const poll: PollDefinition | undefined =
    rawPoll &&
    typeof rawPoll.question === 'string' &&
    Array.isArray(rawPoll.options) &&
    rawPoll.options.length === 2 &&
    typeof rawPoll.options[0] === 'string' &&
    typeof rawPoll.options[1] === 'string'
      ? { question: rawPoll.question, options: [rawPoll.options[0], rawPoll.options[1]] }
      : undefined;

  return {
    id: `${post.author}/${post.permlink}`,
    author: post.author as string,
    permlink: post.permlink as string,
    body: post.body as string,
    created: post.created as string,
    net_votes: post.net_votes as number,
    children: post.children as number,
    pending_payout_value: post.pending_payout_value as string,
    active_votes: (post.active_votes as Sportsbite['active_votes']) || [],
    author_reputation: post.author_reputation as string | undefined,
    sportCategory: metadata.sport_category as string | undefined,
    images: metadata.images as string[] | undefined,
    gifs: metadata.gifs as string[] | undefined,
    poll,
  };
}

export function extractSportsbiteText(body: string): string {
  return body.replace(/!\[.*?\]\(.*?\)/g, '').trim();
}

/**
 * Extract #hashtags from sportsbite body text.
 * Returns lowercase tag names without the leading '#'.
 * Filters out system tags, sport category IDs, and single-char tags.
 */
export function extractHashtags(body: string): string[] {
  const SYSTEM_TAGS = new Set([
    'sportsblock',
    'sportsbites',
    'microblog',
    'sportsarena',
    'hive-115814',
  ]);
  const matches = body.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const match of matches) {
    const tag = match.slice(1).toLowerCase();
    if (tag.length <= 1) continue;
    if (SYSTEM_TAGS.has(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function extractMediaFromBody(body: string): {
  images: string[];
  text: string;
} {
  const images: string[] = [];
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = imageRegex.exec(body)) !== null) {
    images.push(match[1]);
  }
  const text = body.replace(/!\[.*?\]\(.*?\)/g, '').trim();
  return { images, text };
}
