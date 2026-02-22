/**
 * Sportsbites — short-form sports content on Hive.
 *
 * Each day a new container post is created under the @sportsbites account.
 * Individual sportsbites are 280-char comments posted as replies to that
 * day's container. The feed aggregates replies across a rolling 7-day window.
 */

import { SPORTS_ARENA_CONFIG, MUTED_AUTHORS } from './client';
import { makeHiveApiCall } from './api';
import { createCommentOperation, generatePermlink } from './wax-helpers';
import { workerBee as workerBeeLog, error as logError } from './logger';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const SPORTSBITES_CONFIG = {
  PARENT_AUTHOR: 'sportsbites',
  MAX_CHARS: 280,
  DEFAULT_TAGS: ['sportsblock', 'sportsbites', 'microblog'],
  CONTENT_TYPE: 'sportsbite',
  ROLLING_WINDOW_DAYS: 7,
  COMMUNITY_ID: 'hive-115814',
};

// ---------------------------------------------------------------------------
// Date-based container helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReactionEmoji = 'fire' | 'shocked' | 'laughing' | 'angry' | 'eyes' | 'thumbs_down';

export const REACTION_EMOJIS: Record<ReactionEmoji, string> = {
  fire: '🔥',
  shocked: '😱',
  laughing: '😂',
  angry: '😤',
  eyes: '👀',
  thumbs_down: '👎',
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
  id: string; // author/permlink or soft-{dbId}
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
  /** Content source: 'hive' for blockchain, 'soft' for database. Defaults to 'hive'. */
  source?: 'hive' | 'soft';
  /** Database ID for soft sportsbites */
  softId?: string;
  /** Display name for soft users */
  authorDisplayName?: string;
  /** Avatar URL for soft users */
  authorAvatar?: string;
  /** Embedded poll (optional) */
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
// Validation
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

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Create operation (client-side, signed via wallet)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fetch sportsbites (rolling 7-day aggregation)
// ---------------------------------------------------------------------------

export function transformToSportsbite(item: unknown): Sportsbite | null {
  const post = item as Record<string, unknown>;
  if (!post || !post.author) return null;

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse((post.json_metadata as string) || '{}');
  } catch {
    metadata = {};
  }

  // Only treat replies that were actually posted as sportsbites
  if (metadata.content_type !== 'sportsbite') return null;

  // Extract poll if present and valid
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

export async function fetchSportsbites(options: {
  limit?: number;
  before?: string;
  author?: string;
}): Promise<SportsbiteApiResponse> {
  const { limit = 20, before, author } = options;

  try {
    workerBeeLog('fetchSportsbites start', undefined, { limit, before, author });

    const permlinks = getRollingContainerPermlinks();

    // Fetch replies from all daily containers in parallel
    const results = await Promise.allSettled(
      permlinks.map((pl) =>
        makeHiveApiCall<unknown[]>('condenser_api', 'get_content_replies', [
          SPORTSBITES_CONFIG.PARENT_AUTHOR,
          pl,
        ])
      )
    );

    // Merge results, handling failed days gracefully
    let allBites: Sportsbite[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        const bites = result.value
          .map(transformToSportsbite)
          .filter((s): s is Sportsbite => s !== null);
        allBites.push(...bites);
      }
    }

    // Filter out muted authors
    allBites = allBites.filter((s) => !MUTED_AUTHORS.includes(s.author));

    // Sort newest first
    allBites.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Filter by author
    if (author) {
      allBites = allBites.filter((s) => s.author === author);
    }

    // Cursor pagination
    if (before) {
      const beforeIndex = allBites.findIndex((s) => s.id === before);
      if (beforeIndex !== -1) {
        allBites = allBites.slice(beforeIndex + 1);
      }
    }

    const hasMore = allBites.length > limit;
    const page = allBites.slice(0, limit);
    const nextCursor = hasMore ? page[page.length - 1]?.id : undefined;

    workerBeeLog('fetchSportsbites complete', undefined, {
      count: page.length,
      hasMore,
    });

    return {
      success: true,
      sportsbites: page,
      hasMore,
      nextCursor,
      count: page.length,
    };
  } catch (error) {
    logError(
      'fetchSportsbites failed',
      'fetchSportsbites',
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      sportsbites: [],
      hasMore: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch sportsbites',
    };
  }
}

// ---------------------------------------------------------------------------
// Single sportsbite
// ---------------------------------------------------------------------------

export async function getSportsbite(author: string, permlink: string): Promise<Sportsbite | null> {
  try {
    const result = await makeHiveApiCall<Record<string, unknown>>('condenser_api', 'get_content', [
      author,
      permlink,
    ]);

    if (!result || !result.author) return null;
    return transformToSportsbite(result);
  } catch (error) {
    logError('getSportsbite failed', 'getSportsbite', error instanceof Error ? error : undefined);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Text / media extraction
// ---------------------------------------------------------------------------

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
