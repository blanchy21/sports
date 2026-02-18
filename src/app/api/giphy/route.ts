import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Cache for GIF results to reduce API calls
interface GifCache {
  data: GiphyGif[];
  timestamp: number;
  expiresAt: number;
}

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    original: { url: string; width: string; height: string };
    fixed_height: { url: string; width: string; height: string };
    fixed_height_small: { url: string; width: string; height: string };
    fixed_width: { url: string; width: string; height: string };
    preview_gif: { url: string; width: string; height: string };
  };
}

interface GiphyResponse {
  data?: GiphyGif[];
  meta?: { status: number; msg: string };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const gifCache = new Map<string, GifCache>();

// Validation schema for search params
const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  type: z.enum(['search', 'trending']).default('trending'),
  limit: z.coerce.number().min(1).max(50).default(24),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse params
    const params = searchSchema.safeParse({
      q: searchParams.get('q') || undefined,
      type: searchParams.get('type') || 'trending',
      limit: searchParams.get('limit') || 24,
      offset: searchParams.get('offset') || 0,
    });

    if (!params.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: params.error.issues,
        },
        { status: 400 }
      );
    }

    const { q, type, limit, offset } = params.data;

    // Require query for search type
    if (type === 'search' && !q) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "q" is required for search',
        },
        { status: 400 }
      );
    }

    // Get API key from environment (strip quotes in case env var was set with them)
    const apiKey = process.env.GIPHY_API_KEY?.replace(/^["']|["']$/g, '');
    if (!apiKey) {
      console.error('[Giphy API] GIPHY_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'GIF service not configured',
        },
        { status: 503 }
      );
    }

    // Create cache key
    const cacheKey =
      type === 'search' ? `search:${q}:${limit}:${offset}` : `trending:${limit}:${offset}`;

    // Check cache
    const now = Date.now();
    const cached = gifCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // Build Giphy API URL
    const giphyUrl = new URL(
      type === 'search'
        ? 'https://api.giphy.com/v1/gifs/search'
        : 'https://api.giphy.com/v1/gifs/trending'
    );

    giphyUrl.searchParams.set('api_key', apiKey);
    giphyUrl.searchParams.set('limit', String(limit));
    giphyUrl.searchParams.set('offset', String(offset));
    giphyUrl.searchParams.set('rating', 'pg-13'); // Keep content appropriate

    if (type === 'search' && q) {
      giphyUrl.searchParams.set('q', q);
    }

    // Fetch from Giphy (no next.revalidate — we have in-memory caching already)
    const response = await fetch(giphyUrl.toString(), {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(
        `[Giphy API] Error: ${response.status} - ${errorText} (key length: ${apiKey.length})`
      );

      // Return cached data if available, even if expired
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          cached: true,
          expired: true,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch GIFs',
          debug: {
            status: response.status,
            keyLength: apiKey.length,
            keyPrefix: apiKey.slice(0, 3),
          },
        },
        { status: 502 }
      );
    }

    const data: GiphyResponse = await response.json();
    const results = data.data || [];

    // Update cache
    gifCache.set(cacheKey, {
      data: results,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    });

    // Clean old cache entries (keep max 100)
    if (gifCache.size > 100) {
      const oldestKey = gifCache.keys().next().value;
      if (oldestKey) {
        gifCache.delete(oldestKey);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      cached: false,
    });
  } catch (error) {
    console.error('[Giphy API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
