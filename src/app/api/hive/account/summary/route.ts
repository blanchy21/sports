import { NextRequest, NextResponse } from 'next/server';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { accountSummaryQuerySchema, parseSearchParams } from '@/lib/api/validation';
import { createRequestContext, validationError, notFoundError } from '@/lib/api/response';

// Cache configuration - 60 seconds for account data (good balance for profile info)
const CACHE_DURATION = 60 * 1000;

// Per-user account cache
interface AccountCache {
  account: unknown;
  timestamp: number;
  expiresAt: number;
}

const accountCache = new Map<string, AccountCache>();
const MAX_ACCOUNT_CACHE_SIZE = 200;
let accountRequestCount = 0;

/** Evict oldest entry when cache exceeds max size */
function boundedCacheSet<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number) {
  if (map.size >= maxSize) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

// Cleanup old cache entries periodically
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of accountCache.entries()) {
    // Remove entries that are more than 10 minutes old
    if (now - entry.timestamp > 10 * 60 * 1000) {
      accountCache.delete(key);
    }
  }
}

function serializeAccount(account: unknown) {
  if (!account || typeof account !== 'object') {
    return account;
  }

  const safeAccount: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(account)) {
    if (value instanceof Date) {
      safeAccount[key] = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      safeAccount[key] = serializeAccount(value);
    } else if (Array.isArray(value)) {
      safeAccount[key] = value.map((item) =>
        item && typeof item === 'object' ? serializeAccount(item) : item
      );
    } else {
      safeAccount[key] = value;
    }
  }

  return safeAccount;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

const ROUTE = '/api/hive/account/summary';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  // Validate query parameters
  const parseResult = parseSearchParams(request.nextUrl.searchParams, accountSummaryQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { username } = parseResult.data;
  const now = Date.now();

  // Deterministic cleanup every 20 requests
  if (++accountRequestCount % 20 === 0) cleanupCache();

  // Check cache first
  const cached = accountCache.get(username);
  if (cached && now < cached.expiresAt) {
    return NextResponse.json(
      {
        success: true,
        account: cached.account,
        cached: true,
        timestamp: cached.timestamp,
      },
      { headers: CACHE_HEADERS }
    );
  }

  try {
    ctx.log.debug('Fetching account summary', { username });

    const account = await retryWithBackoff(() => fetchUserAccount(username), {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    });

    if (!account) {
      return notFoundError(`Account ${username} not found`, ctx.requestId);
    }

    const serializedAccount = serializeAccount(account);

    // Cache the result (bounded to prevent unbounded growth)
    boundedCacheSet(
      accountCache,
      username,
      {
        account: serializedAccount,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      },
      MAX_ACCOUNT_CACHE_SIZE
    );

    return NextResponse.json(
      {
        success: true,
        account: serializedAccount,
        cached: false,
        timestamp: now,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    // Try to return stale cache data on error (graceful degradation)
    const staleCache = accountCache.get(username);
    if (staleCache) {
      ctx.log.info('Returning stale cache due to error');
      return NextResponse.json({
        success: true,
        account: staleCache.account,
        cached: true,
        stale: true,
        timestamp: staleCache.timestamp,
      });
    }

    return ctx.handleError(error);
  }
}
