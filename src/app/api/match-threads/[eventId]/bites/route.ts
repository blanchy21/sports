import { NextRequest, NextResponse } from 'next/server';
import { fetchMatchThreadBites } from '@/lib/hive-workerbee/match-threads';
import { fetchSoftMatchThreadBites } from '@/lib/hive-workerbee/match-threads-server';
import { Sportsbite } from '@/lib/hive-workerbee/sportsbites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/match-threads/[eventId]/bites
 *
 * Fetches sportsbites for a match thread, merging Hive and soft bites.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const before = searchParams.get('before') || undefined;

    // Fetch ALL from both sources (match thread bites are bounded, typically <200)
    const [hiveResult, softResult] = await Promise.allSettled([
      fetchMatchThreadBites(eventId),
      fetchSoftMatchThreadBites(eventId),
    ]);

    const allBites: Sportsbite[] = [];

    if (hiveResult.status === 'fulfilled') {
      const tagged = hiveResult.value.map((s) => ({ ...s, source: 'hive' as const }));
      allBites.push(...tagged);
    }

    if (softResult.status === 'fulfilled') {
      allBites.push(...softResult.value);
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    const uniqueBites = allBites.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    // Sort newest first
    uniqueBites.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Apply cursor: skip everything up to and including the cursor item
    let afterCursor = uniqueBites;
    if (before) {
      const cursorIndex = uniqueBites.findIndex((b) => b.id === before);
      if (cursorIndex !== -1) {
        afterCursor = uniqueBites.slice(cursorIndex + 1);
      }
    }

    // Paginate
    const hasMore = afterCursor.length > limit;
    const page = afterCursor.slice(0, limit);
    const nextCursor = hasMore ? page[page.length - 1]?.id : undefined;

    return NextResponse.json(
      {
        success: true,
        sportsbites: page,
        hasMore,
        nextCursor,
        count: page.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('[MatchThreadBites] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch thread bites',
        sportsbites: [],
        hasMore: false,
        count: 0,
      },
      { status: 500 }
    );
  }
}
