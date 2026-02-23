/**
 * Sportsbites — short-form sports content on Hive.
 *
 * Pure types, constants, and operation builders live in ./shared.ts.
 * This file contains server-side functions that make API calls.
 */

import { MUTED_AUTHORS } from './shared';
import { makeHiveApiCall } from './api';
import { workerBee as workerBeeLog, error as logError } from './logger';

// Re-export everything from shared for backward compatibility
export {
  SPORTSBITES_CONFIG,
  MUTED_AUTHORS,
  type ReactionEmoji,
  REACTION_EMOJIS,
  type ReactionCounts,
  type PollDefinition,
  type PollResults,
  type Sportsbite,
  type SportsbiteApiResponse,
  type PublishSportsbiteData,
  type PublishSportsbiteResult,
  validateSportsbiteContent,
  getContainerPermlink,
  getRollingContainerPermlinks,
  formatContainerDate,
  createSportsbiteOperation,
  transformToSportsbite,
  extractSportsbiteText,
  extractHashtags,
  extractMediaFromBody,
} from './shared';

import {
  SPORTSBITES_CONFIG,
  getRollingContainerPermlinks,
  transformToSportsbite,
  type Sportsbite,
  type SportsbiteApiResponse,
} from './shared';

// ---------------------------------------------------------------------------
// Fetch sportsbites (rolling 7-day aggregation)
// ---------------------------------------------------------------------------

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
