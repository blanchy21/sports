import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Cache for GIF results to reduce API calls
interface GifCache {
  data: TenorGif[];
  timestamp: number;
  expiresAt: number;
}

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif: { url: string };
    tinygif: { url: string };
    nanogif: { url: string };
  };
}

interface TenorResponse {
  results?: TenorGif[];
  error?: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const gifCache = new Map<string, GifCache>();

// Validation schema for search params
const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  type: z.enum(['search', 'featured']).default('featured'),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse params
    const params = searchSchema.safeParse({
      q: searchParams.get('q') || undefined,
      type: searchParams.get('type') || 'featured',
      limit: searchParams.get('limit') || 20,
    });

    if (!params.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters',
        details: params.error.issues,
      }, { status: 400 });
    }

    const { q, type, limit } = params.data;

    // Require query for search type
    if (type === 'search' && !q) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter "q" is required for search',
      }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.TENOR_API_KEY;
    if (!apiKey) {
      console.error('[Tenor API] TENOR_API_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'GIF service not configured',
      }, { status: 503 });
    }

    // Create cache key
    const cacheKey = type === 'search' ? `search:${q}:${limit}` : `featured:${limit}`;

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

    // Build Tenor API URL
    const tenorUrl = new URL(
      type === 'search'
        ? 'https://tenor.googleapis.com/v2/search'
        : 'https://tenor.googleapis.com/v2/featured'
    );

    tenorUrl.searchParams.set('key', apiKey);
    tenorUrl.searchParams.set('limit', String(limit));
    tenorUrl.searchParams.set('media_filter', 'gif,tinygif');

    if (type === 'search' && q) {
      tenorUrl.searchParams.set('q', q);
    }

    // Fetch from Tenor
    const response = await fetch(tenorUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Tenor API] Error: ${response.status} - ${errorText}`);

      // Return cached data if available, even if expired
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          cached: true,
          expired: true,
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to fetch GIFs',
      }, { status: 502 });
    }

    const data: TenorResponse = await response.json();
    const results = data.results || [];

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
    console.error('[Tenor API] Unexpected error:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
