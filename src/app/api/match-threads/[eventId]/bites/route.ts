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

    const allBites: Sportsbite[] = [];

    // Fetch Hive and soft bites in parallel
    const [hiveResult, softBites] = await Promise.allSettled([
      fetchMatchThreadBites(eventId, { limit, before }),
      fetchSoftMatchThreadBites(eventId, { limit }),
    ]);

    if (hiveResult.status === 'fulfilled') {
      const tagged = hiveResult.value.sportsbites.map((s) => ({ ...s, source: 'hive' as const }));
      allBites.push(...tagged);
    }

    if (softBites.status === 'fulfilled') {
      allBites.push(...softBites.value);
    }

    // Sort newest first
    allBites.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Paginate
    const hasMore = allBites.length > limit;
    const page = allBites.slice(0, limit);
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
