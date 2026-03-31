import { NextRequest, NextResponse } from 'next/server';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { createApiHandler, validationError } from '@/lib/api/response';
import { boundedCacheSet, cleanupExpired } from '@/lib/cache/bounded-map';
import { z } from 'zod';
import { hiveUsernameSchema, parseSearchParams } from '@/lib/api/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Shared cache with the single-user endpoint (same structure)
interface AccountCache {
  account: unknown;
  timestamp: number;
  expiresAt: number;
}

const accountCache = new Map<string, AccountCache>();
const MAX_CACHE_SIZE = 200;
const CACHE_DURATION = 60 * 1000;
const MAX_BATCH_SIZE = 25;

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

const batchQuerySchema = z.object({
  usernames: z
    .string()
    .min(1, 'usernames parameter is required')
    .transform((val) => val.split(',').map((u) => u.trim().toLowerCase()))
    .pipe(z.array(hiveUsernameSchema).min(1).max(MAX_BATCH_SIZE)),
});

function serializeAccount(account: unknown) {
  if (!account || typeof account !== 'object') return account;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(account)) {
    if (value instanceof Date) {
      safe[key] = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      safe[key] = serializeAccount(value);
    } else if (Array.isArray(value)) {
      safe[key] = value.map((item) =>
        item && typeof item === 'object' ? serializeAccount(item) : item
      );
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

const ROUTE = '/api/hive/account/summary/batch';

export const GET = createApiHandler(ROUTE, async (request, ctx) => {
  const parseResult = parseSearchParams(
    (request as NextRequest).nextUrl.searchParams,
    batchQuerySchema
  );

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const usernames = [...new Set(parseResult.data.usernames)];
  const now = Date.now();

  // Separate cached vs uncached
  const results: Record<string, unknown> = {};
  const uncached: string[] = [];

  for (const username of usernames) {
    const cached = accountCache.get(username);
    if (cached && now < cached.expiresAt) {
      results[username] = cached.account;
    } else {
      uncached.push(username);
    }
  }

  // Fetch uncached in parallel
  if (uncached.length > 0) {
    ctx.log.debug('Batch fetching accounts', { count: uncached.length, usernames: uncached });

    const fetched = await Promise.allSettled(
      uncached.map((username) =>
        retryWithBackoff(() => fetchUserAccount(username), {
          maxRetries: 1,
          initialDelay: 500,
          maxDelay: 2000,
          backoffMultiplier: 2,
        })
      )
    );

    // Cleanup expired entries periodically
    if (accountCache.size > MAX_CACHE_SIZE / 2) {
      cleanupExpired(accountCache, (entry) => Date.now() - entry.timestamp > 10 * 60 * 1000);
    }

    for (let i = 0; i < uncached.length; i++) {
      const result = fetched[i];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const serialized = serializeAccount(result.value);
      results[uncached[i]] = serialized;

      boundedCacheSet(
        accountCache,
        uncached[i],
        { account: serialized, timestamp: now, expiresAt: now + CACHE_DURATION },
        MAX_CACHE_SIZE
      );
    }
  }

  return NextResponse.json(
    { success: true, accounts: results, timestamp: now },
    { headers: CACHE_HEADERS }
  );
});
