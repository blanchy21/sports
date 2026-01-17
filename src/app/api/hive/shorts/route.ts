import { NextRequest, NextResponse } from 'next/server';
import { fetchShorts, getShort, SHORTS_CONFIG } from '@/lib/hive-workerbee/shorts';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Query parameter validation schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  before: z.string().optional(),
  author: z.string().optional(),
  permlink: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse and validate query parameters
  const parseResult = querySchema.safeParse({
    limit: searchParams.get('limit') || 20,
    before: searchParams.get('before') || undefined,
    author: searchParams.get('author') || undefined,
    permlink: searchParams.get('permlink') || undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid parameters', 
        details: parseResult.error.flatten() 
      },
      { status: 400 }
    );
  }

  const { limit, before, author, permlink } = parseResult.data;

  try {
    // Fetch a specific short if author and permlink provided
    if (author && permlink) {
      const short = await retryWithBackoff(
        () => getShort(author, permlink),
        {
          maxRetries: 2,
          initialDelay: 500,
          maxDelay: 5000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        short: short || null,
      });
    }

    // Fetch shorts feed
    const result = await retryWithBackoff(
      () => fetchShorts({ limit, before, author }),
      {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2,
      }
    );

    return NextResponse.json({
      success: result.success,
      shorts: result.shorts,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      count: result.count,
      config: {
        maxChars: SHORTS_CONFIG.MAX_CHARS,
        parentAuthor: SHORTS_CONFIG.PARENT_AUTHOR,
        parentPermlink: SHORTS_CONFIG.PARENT_PERMLINK,
      },
    });
  } catch (error) {
    console.error('[Shorts API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch shorts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
