/**
 * Sportsbite and match thread operation builders, types, and helpers.
 * No WASM calls — safe for client-side bundling.
 */

import { MUTED_AUTHORS, SPORTS_ARENA_CONFIG } from './platform-config';
import { extractMentions, generatePermlink, stripMarkdown } from './text-utils';
import { createCommentOperation } from './hive-operations';

// ---------------------------------------------------------------------------
// Sportsbites config & types
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
  tipTotal?: number;
  tipCount?: number;
  tipDetails?: Array<{ sender: string; amount: number }>;
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
  const plainText = stripMarkdown(data.body);
  const description = plainText.length > 160 ? plainText.slice(0, 157) + '...' : plainText;
  const users = extractMentions(data.body, data.author);

  const metadata: Record<string, unknown> = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: [...SPORTSBITES_CONFIG.DEFAULT_TAGS, ...(data.sportCategory ? [data.sportCategory] : [])],
    content_type: SPORTSBITES_CONFIG.CONTENT_TYPE,
    description,
    users: users.length > 0 ? users : undefined,
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

// ---------------------------------------------------------------------------
// Match thread config & helpers (pure — no WASM)
// ---------------------------------------------------------------------------

export const MATCH_THREAD_CONFIG = {
  PARENT_AUTHOR: 'sportsbites',
  CONTENT_TYPE: 'match-thread-container',
  THREAD_OPEN_HOURS: 24,
  PRE_CREATE_HOURS: 2,
  DEFAULT_TAGS: ['sportsblock', 'match-thread', 'sportsbites', 'hive-115814'],
};

/** Deterministic permlink for a match thread: `match-thread-{eventId}` */
export function getMatchThreadPermlink(eventId: string): string {
  return `match-thread-${eventId}`;
}

/**
 * Create a sportsbite operation for posting inside a match thread.
 * Pure function — no WASM calls, safe for client bundling.
 */
export function createMatchThreadSportsbiteOperation(
  data: PublishSportsbiteData & { eventId: string }
) {
  if (MUTED_AUTHORS.includes(data.author)) {
    throw new Error('This account has been muted and cannot post sportsbites.');
  }

  const validation = validateSportsbiteContent(data.body);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const permlink = generatePermlink('bite');
  const threadPermlink = getMatchThreadPermlink(data.eventId);

  let fullBody = data.body;
  if (data.images && data.images.length > 0) {
    fullBody += '\n\n' + data.images.map((img) => `![](${img})`).join('\n');
  }
  if (data.gifs && data.gifs.length > 0) {
    fullBody += '\n\n' + data.gifs.map((gif) => `![](${gif})`).join('\n');
  }

  const metadata = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: [
      ...MATCH_THREAD_CONFIG.DEFAULT_TAGS,
      ...(data.sportCategory ? [data.sportCategory] : []),
    ],
    content_type: SPORTSBITES_CONFIG.CONTENT_TYPE,
    sport_category: data.sportCategory,
    images: data.images,
    gifs: data.gifs,
    match_thread_id: data.eventId,
  };

  return createCommentOperation({
    author: data.author,
    body: fullBody,
    parentAuthor: MATCH_THREAD_CONFIG.PARENT_AUTHOR,
    parentPermlink: threadPermlink,
    permlink,
    title: '',
    jsonMetadata: JSON.stringify(metadata),
  });
}
