import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestContext, validationError } from '@/lib/api/response';
import { fetchSportsbites, Sportsbite } from '@/lib/hive-workerbee/sportsbites';
import { fetchSoftSportsbites } from '@/lib/hive-workerbee/sportsbites-server';
import { prisma } from '@/lib/db/prisma';

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

    // Batch fetch tip totals for hive sportsbites on this page
    const hiveBitesOnPage = page.filter((s) => s.source !== 'soft');
    if (hiveBitesOnPage.length > 0) {
      try {
        const authors = hiveBitesOnPage.map((s) => s.author);
        const permlinks = hiveBitesOnPage.map((s) => s.permlink);
        const tipTotals = await prisma.$queryRaw<
          Array<{ author: string; permlink: string; total: string; count: number }>
        >`
          SELECT author, permlink,
                 COALESCE(SUM(amount), 0)::text as total,
                 COUNT(*)::int as count
          FROM tips
          WHERE author = ANY(${authors}::text[])
            AND permlink = ANY(${permlinks}::text[])
          GROUP BY author, permlink
        `;
        for (const bite of page) {
          const tip = tipTotals.find(
            (t) => t.author === bite.author && t.permlink === bite.permlink
          );
          bite.tipTotal = tip ? parseFloat(tip.total) : 0;
          bite.tipCount = tip ? tip.count : 0;
        }
      } catch {
        // Non-critical — leave tips at 0
      }
    }

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
