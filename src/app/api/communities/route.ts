import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebaseCommunitiesAdmin } from '@/lib/firebase/communities-admin';
import { isAdminConfigured } from '@/lib/firebase/admin';
import {
  createRequestContext,
  validationError,
  unauthorizedError,
} from '@/lib/api/response';
import { CommunityFilters, CommunityType } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/communities';

// Validation schemas
const listQuerySchema = z.object({
  search: z.string().max(100).optional(),
  sportCategory: z.string().max(50).optional(),
  type: z.enum(['public', 'private', 'invite-only']).optional(),
  sort: z.enum(['memberCount', 'postCount', 'createdAt', 'name']).optional(),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
  offset: z.string().optional().transform((val) => val ? parseInt(val, 10) : 0),
});

const createCommunitySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be at most 100 characters'),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  about: z.string().min(10, 'About must be at least 10 characters').max(500, 'About must be at most 500 characters'),
  description: z.string().max(5000).optional(),
  sportCategory: z.string().min(1, 'Sport category is required'),
  type: z.enum(['public', 'private', 'invite-only']),
  avatar: z.string().url('Invalid avatar URL').optional(),
  coverImage: z.string().url('Invalid cover image URL').optional(),
  // Auth info from client
  creatorId: z.string().min(1, 'Creator ID is required'),
  creatorUsername: z.string().min(1, 'Creator username is required'),
  hiveUsername: z.string().optional(),
});

/**
 * GET /api/communities - List communities with filters
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = listQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { search, sportCategory, type, sort, limit } = parseResult.data;

    ctx.log.debug('Listing communities', { search, sportCategory, type, sort, limit });

    const filters: CommunityFilters = {
      search,
      sportCategory,
      type: type as CommunityType | undefined,
      sort: sort as CommunityFilters['sort'],
      limit,
    };

    if (!isAdminConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable with your Firebase service account JSON.',
        code: 'FIREBASE_NOT_CONFIGURED',
      }, { status: 503 });
    }

    let result;
    try {
      result = await FirebaseCommunitiesAdmin.listCommunities(filters);
    } catch (firebaseError: unknown) {
      const errorMessage = firebaseError instanceof Error ? firebaseError.message : String(firebaseError);
      // Check for credential errors
      if (errorMessage.includes('default credentials') || errorMessage.includes('authentication')) {
        return NextResponse.json({
          success: false,
          error: 'Firebase Admin credentials not configured. Please add FIREBASE_SERVICE_ACCOUNT_KEY to your .env.local file with the service account JSON from Firebase Console > Project Settings > Service Accounts.',
          code: 'FIREBASE_CREDENTIALS_MISSING',
        }, { status: 503 });
      }
      throw firebaseError;
    }

    return NextResponse.json({
      success: true,
      communities: result.communities,
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * POST /api/communities - Create a new community
 */
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const body = await request.json();
    const parseResult = createCommunitySchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const {
      name,
      slug,
      about,
      description,
      sportCategory,
      type,
      avatar,
      coverImage,
      creatorId,
      creatorUsername,
      hiveUsername,
    } = parseResult.data;

    // Validate creator is authenticated (basic check - could be enhanced with Firebase Auth verification)
    if (!creatorId || !creatorUsername) {
      return unauthorizedError('Authentication required to create a community', ctx.requestId);
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID.',
        code: 'FIREBASE_NOT_CONFIGURED',
      }, { status: 503 });
    }

    ctx.log.info('Creating community', { name, slug, sportCategory, type, creatorId });

    const community = await FirebaseCommunitiesAdmin.createCommunity(
      {
        name,
        slug,
        about,
        description,
        sportCategory,
        type,
        avatar,
        coverImage,
      },
      creatorId,
      creatorUsername,
      hiveUsername
    );

    return NextResponse.json({
      success: true,
      community,
    }, { status: 201 });
  } catch (error) {
    return ctx.handleError(error);
  }
}
