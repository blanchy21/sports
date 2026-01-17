/**
 * Shorts/Microblog Integration
 * 
 * Handles short-form content (280 char microblogs) stored as Hive comments
 * under a dedicated parent post.
 */

import { SPORTS_ARENA_CONFIG } from './client';
import { makeHiveApiCall } from './api';
import { createCommentOperation, generatePermlink } from './wax-helpers';
import { workerBee as workerBeeLog, error as logError } from './logger';

// Shorts configuration
export const SHORTS_CONFIG = {
  // Parent post that holds all shorts as comments
  PARENT_AUTHOR: 'sportsblock',
  PARENT_PERMLINK: 'shorts-feed-v1',
  // Character limit for short content
  MAX_CHARS: 280,
  // Tags for shorts
  DEFAULT_TAGS: ['sportsblock', 'sportsblock-shorts', 'microblog'],
  // Metadata type identifier
  CONTENT_TYPE: 'short',
};

// TypeScript interfaces for Shorts
export interface Short {
  id: string;
  author: string;
  permlink: string;
  body: string;
  created: string;
  net_votes: number;
  children: number; // reply count
  pending_payout_value: string;
  active_votes: Array<{
    voter: string;
    weight: number;
    percent: number;
    time: string;
  }>;
  // Shorts-specific metadata
  sportCategory?: string;
  images?: string[];
  gifs?: string[];
  // Author info (populated separately)
  author_reputation?: string;
}

export interface ShortsApiResponse {
  success: boolean;
  shorts: Short[];
  hasMore: boolean;
  nextCursor?: string;
  count: number;
  error?: string;
}

export interface PublishShortData {
  body: string;
  author: string;
  sportCategory?: string;
  images?: string[];
  gifs?: string[];
}

export interface PublishShortResult {
  success: boolean;
  permlink?: string;
  author?: string;
  url?: string;
  error?: string;
}

/**
 * Validate short content before publishing
 */
export function validateShortContent(body: string): {
  isValid: boolean;
  errors: string[];
  charCount: number;
} {
  const errors: string[] = [];
  const charCount = body.length;

  if (!body || body.trim().length === 0) {
    errors.push('Content is required');
  }

  if (charCount > SHORTS_CONFIG.MAX_CHARS) {
    errors.push(`Content exceeds ${SHORTS_CONFIG.MAX_CHARS} characters (${charCount})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    charCount,
  };
}

/**
 * Build JSON metadata for a short
 */
function buildShortMetadata(data: PublishShortData): string {
  const metadata = {
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: [
      ...SHORTS_CONFIG.DEFAULT_TAGS,
      ...(data.sportCategory ? [data.sportCategory] : []),
    ],
    content_type: SHORTS_CONFIG.CONTENT_TYPE,
    sport_category: data.sportCategory,
    images: data.images,
    gifs: data.gifs,
  };

  return JSON.stringify(metadata);
}

/**
 * Create a short operation for Aioha to broadcast
 */
export function createShortOperation(data: PublishShortData) {
  const validation = validateShortContent(data.body);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Generate unique permlink for the short
  const permlink = generatePermlink('short');

  // Build the comment body - include images/gifs if present
  let fullBody = data.body;
  
  if (data.images && data.images.length > 0) {
    fullBody += '\n\n' + data.images.map(img => `![](${img})`).join('\n');
  }
  
  if (data.gifs && data.gifs.length > 0) {
    fullBody += '\n\n' + data.gifs.map(gif => `![](${gif})`).join('\n');
  }

  return createCommentOperation({
    author: data.author,
    body: fullBody,
    parentAuthor: SHORTS_CONFIG.PARENT_AUTHOR,
    parentPermlink: SHORTS_CONFIG.PARENT_PERMLINK,
    permlink,
    title: '', // Shorts have no title
    jsonMetadata: buildShortMetadata(data),
  });
}

/**
 * Fetch shorts from Hive (comments under the parent post)
 */
export async function fetchShorts(options: {
  limit?: number;
  before?: string;
  author?: string;
}): Promise<ShortsApiResponse> {
  const { limit = 20, before, author } = options;

  try {
    workerBeeLog('fetchShorts start', undefined, { limit, before, author });

    // Fetch comments/replies to the parent shorts post
    const result = await makeHiveApiCall<unknown[]>(
      'condenser_api',
      'get_content_replies',
      [SHORTS_CONFIG.PARENT_AUTHOR, SHORTS_CONFIG.PARENT_PERMLINK]
    );

    if (!result || !Array.isArray(result)) {
      return {
        success: true,
        shorts: [],
        hasMore: false,
        count: 0,
      };
    }

    // Transform and filter the results
    let shorts: Short[] = result
      .map((item: unknown) => {
        const post = item as Record<string, unknown>;
        
        // Parse metadata
        let metadata: Record<string, unknown> = {};
        try {
          metadata = JSON.parse((post.json_metadata as string) || '{}');
        } catch {
          metadata = {};
        }

        // Only include items that are shorts (have the correct content_type)
        if (metadata.content_type !== SHORTS_CONFIG.CONTENT_TYPE) {
          // Still include for now, as we're bootstrapping
          // return null;
        }

        const short: Short = {
          id: `${post.author}/${post.permlink}`,
          author: post.author as string,
          permlink: post.permlink as string,
          body: post.body as string,
          created: post.created as string,
          net_votes: post.net_votes as number,
          children: post.children as number,
          pending_payout_value: post.pending_payout_value as string,
          active_votes: (post.active_votes as Short['active_votes']) || [],
          author_reputation: post.author_reputation as string | undefined,
          sportCategory: metadata.sport_category as string | undefined,
          images: metadata.images as string[] | undefined,
          gifs: metadata.gifs as string[] | undefined,
        };
        return short;
      })
      .filter((s): s is Short => s !== null);

    // Sort by created date (newest first)
    shorts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Filter by author if specified
    if (author) {
      shorts = shorts.filter(s => s.author === author);
    }

    // Handle cursor-based pagination
    if (before) {
      const beforeIndex = shorts.findIndex(s => s.id === before);
      if (beforeIndex !== -1) {
        shorts = shorts.slice(beforeIndex + 1);
      }
    }

    // Apply limit
    const hasMore = shorts.length > limit;
    const paginatedShorts = shorts.slice(0, limit);
    const nextCursor = hasMore ? paginatedShorts[paginatedShorts.length - 1]?.id : undefined;

    workerBeeLog('fetchShorts complete', undefined, { count: paginatedShorts.length, hasMore });

    return {
      success: true,
      shorts: paginatedShorts,
      hasMore,
      nextCursor,
      count: paginatedShorts.length,
    };
  } catch (error) {
    logError('fetchShorts failed', 'fetchShorts', error instanceof Error ? error : undefined);
    
    return {
      success: false,
      shorts: [],
      hasMore: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch shorts',
    };
  }
}

/**
 * Get a single short by author and permlink
 */
export async function getShort(author: string, permlink: string): Promise<Short | null> {
  try {
    const result = await makeHiveApiCall<Record<string, unknown>>(
      'condenser_api',
      'get_content',
      [author, permlink]
    );

    if (!result || !result.author) {
      return null;
    }

    // Parse metadata
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse((result.json_metadata as string) || '{}');
    } catch {
      metadata = {};
    }

    return {
      id: `${result.author}/${result.permlink}`,
      author: result.author as string,
      permlink: result.permlink as string,
      body: result.body as string,
      created: result.created as string,
      net_votes: result.net_votes as number,
      children: result.children as number,
      pending_payout_value: result.pending_payout_value as string,
      active_votes: (result.active_votes as Short['active_votes']) || [],
      author_reputation: result.author_reputation as string,
      sportCategory: metadata.sport_category as string | undefined,
      images: metadata.images as string[] | undefined,
      gifs: metadata.gifs as string[] | undefined,
    };
  } catch (error) {
    logError('getShort failed', 'getShort', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Extract plain text from short body (removes image markdown)
 */
export function extractShortText(body: string): string {
  // Remove image markdown ![...](...) 
  return body
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .trim();
}

/**
 * Extract media URLs from short body
 */
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
