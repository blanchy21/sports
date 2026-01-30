/**
 * Sportsbites — short-form sports content on Hive.
 *
 * Each day a new container post is created under the @sportsbites account.
 * Individual sportsbites are 280-char comments posted as replies to that
 * day's container. The feed aggregates replies across a rolling 7-day window.
 */

import { SPORTS_ARENA_CONFIG } from './client';
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

export interface Sportsbite {
  id: string; // author/permlink or soft-{firestoreId}
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
  /** Content source: 'hive' for blockchain, 'soft' for Firebase. Defaults to 'hive'. */
  source?: 'hive' | 'soft';
  /** Firestore document ID for soft sportsbites */
  softId?: string;
  /** Display name for soft users */
  authorDisplayName?: string;
  /** Avatar URL for soft users */
  authorAvatar?: string;
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
  const metadata = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: [...SPORTSBITES_CONFIG.DEFAULT_TAGS, ...(data.sportCategory ? [data.sportCategory] : [])],
    content_type: SPORTSBITES_CONFIG.CONTENT_TYPE,
    sport_category: data.sportCategory,
    images: data.images,
    gifs: data.gifs,
  };

  return JSON.stringify(metadata);
}

// ---------------------------------------------------------------------------
// Create operation (client-side, signed via Aioha)
// ---------------------------------------------------------------------------

export function createSportsbiteOperation(data: PublishSportsbiteData) {
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

function transformToSportsbite(item: unknown): Sportsbite | null {
  const post = item as Record<string, unknown>;
  if (!post || !post.author) return null;

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse((post.json_metadata as string) || '{}');
  } catch {
    metadata = {};
  }

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
