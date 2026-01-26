import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebaseAuth, Profile } from '@/lib/firebase/auth';
import {
  createRequestContext,
  validationError,
  notFoundError,
} from '@/lib/api/response';

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
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10).pipe(z.number().int().min(1).max(50)),
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
 * Convert Profile to response format
 */
function profileToResponse(profile: Profile): SoftUserResponse {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    isHiveUser: profile.isHiveUser,
    hiveUsername: profile.hiveUsername,
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
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getUsersQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { search, username, userId, limit } = parseResult.data;

    ctx.log.debug('Fetching soft users', { search, username, userId, limit });

    // Fetch by user ID
    if (userId) {
      const profile = await FirebaseAuth.getProfileById(userId);

      if (!profile) {
        return notFoundError(`User with ID '${userId}' not found`, ctx.requestId);
      }

      return NextResponse.json({
        success: true,
        user: profileToResponse(profile),
      });
    }

    // Fetch by exact username
    if (username) {
      const profile = await FirebaseAuth.getProfileByUsername(username);

      if (!profile) {
        return notFoundError(`User '${username}' not found`, ctx.requestId);
      }

      return NextResponse.json({
        success: true,
        user: profileToResponse(profile),
      });
    }

    // Search by username prefix
    if (search) {
      const profiles = await FirebaseAuth.searchProfiles(search, limit);

      return NextResponse.json({
        success: true,
        users: profiles.map(profileToResponse),
        count: profiles.length,
      });
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
