import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, notFoundError } from '@/lib/api/response';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/users';

// ============================================
// Validation Schemas
// ============================================

const getUsersQuerySchema = z.object({
  search: z.string().min(1).max(50).optional(),
  username: z.string().min(1).max(50).optional(),
  userId: z.string().min(1).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
});

/**
 * Soft user profile response format
 */
interface SoftUserResponse {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isHiveUser: boolean;
  hiveUsername?: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

/**
 * Convert Prisma Profile to response format
 */
function profileToResponse(profile: {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isHiveUser: boolean;
  hiveUsername: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
}): SoftUserResponse {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio || undefined,
    avatarUrl: profile.avatarUrl || undefined,
    isHiveUser: profile.isHiveUser,
    hiveUsername: profile.hiveUsername || undefined,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    lastActiveAt: profile.lastActiveAt?.toISOString(),
  };
}

/**
 * GET /api/soft/users - Search or fetch soft user profiles
 *
 * Query params:
 * - search: string (search by username prefix)
 * - username: string (fetch by exact username)
 * - userId: string (fetch by user ID)
 * - limit: number (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  // Rate limiting to prevent user enumeration
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.read, 'softUsersRead');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: createRateLimitHeaders(0, rateLimit.reset, RATE_LIMITS.read.limit),
      }
    );
  }

  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getUsersQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { search, username, userId, limit } = parseResult.data;

    ctx.log.debug('Fetching soft users', { search, username, userId, limit });

    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    };

    // Fetch by user ID
    if (userId) {
      const profile = await prisma.profile.findUnique({ where: { id: userId } });

      if (!profile) {
        return notFoundError(`User with ID '${userId}' not found`, ctx.requestId);
      }

      return NextResponse.json(
        {
          success: true,
          user: profileToResponse(profile),
        },
        { headers: cacheHeaders }
      );
    }

    // Fetch by exact username
    if (username) {
      const profile = await prisma.profile.findUnique({ where: { username } });

      if (!profile) {
        return notFoundError(`User '${username}' not found`, ctx.requestId);
      }

      return NextResponse.json(
        {
          success: true,
          user: profileToResponse(profile),
        },
        { headers: cacheHeaders }
      );
    }

    // Search by username prefix
    if (search) {
      const profiles = await prisma.profile.findMany({
        where: { username: { startsWith: search.toLowerCase() } },
        take: limit,
      });

      return NextResponse.json(
        {
          success: true,
          users: profiles.map(profileToResponse),
          count: profiles.length,
        },
        { headers: cacheHeaders }
      );
    }

    // No valid query params provided
    return validationError(
      'Please provide one of: search, username, or userId query parameter',
      ctx.requestId
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
