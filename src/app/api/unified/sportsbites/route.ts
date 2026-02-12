import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestContext, validationError } from '@/lib/api/response';
import { fetchSportsbites, Sportsbite } from '@/lib/hive-workerbee/sportsbites';
import { fetchSoftSportsbites } from '@/lib/hive-workerbee/sportsbites-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/unified/sportsbites';

// ============================================
// Validation
// ============================================

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(50)),
  before: z.string().optional(),
  author: z.string().min(1).max(50).optional(),
  includeHive: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .pipe(z.boolean()),
  includeSoft: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .pipe(z.boolean()),
});

// ============================================
// GET /api/unified/sportsbites
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = querySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { limit, before, author, includeHive, includeSoft } = parseResult.data;

    ctx.log.debug('Fetching unified sportsbites', {
      limit,
      before,
      author,
      includeHive,
      includeSoft,
    });

    const allBites: Sportsbite[] = [];
    const fetchPromises: Promise<void>[] = [];

    // Fetch Hive sportsbites
    if (includeHive) {
      fetchPromises.push(
        fetchSportsbites({ limit, before, author })
          .then((result) => {
            if (result.success && result.sportsbites.length > 0) {
              // Tag source for each Hive sportsbite
              const tagged = result.sportsbites.map((s) => ({ ...s, source: 'hive' as const }));
              allBites.push(...tagged);
            }
          })
          .catch((error) => {
            ctx.log.warn('Failed to fetch Hive sportsbites', { error });
          })
      );
    }

    // Fetch soft sportsbites
    if (includeSoft) {
      fetchPromises.push(
        fetchSoftSportsbites({ limit, author })
          .then((softBites) => {
            allBites.push(...softBites);
          })
          .catch((error) => {
            ctx.log.warn('Failed to fetch soft sportsbites', { error });
          })
      );
    }

    await Promise.all(fetchPromises);

    // Sort merged results by date (newest first)
    allBites.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Apply pagination
    const hasMore = allBites.length > limit;
    const page = allBites.slice(0, limit);
    const nextCursor = hasMore ? page[page.length - 1]?.id : undefined;

    const hiveBites = page.filter((s) => s.source !== 'soft');
    const softBites = page.filter((s) => s.source === 'soft');

    return NextResponse.json(
      {
        success: true,
        sportsbites: page,
        hasMore,
        nextCursor,
        count: page.length,
        sources: { hive: hiveBites.length, soft: softBites.length },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
