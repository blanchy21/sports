/**
 * Admin Curators API Route
 *
 * Manage designated curator accounts.
 * Requires admin account access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestContext, forbiddenError, validationError } from '@/lib/api/response';
import { isAdminAccount } from '@/lib/admin/config';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/admin/curators';
const CURATORS_DOC = 'config/curators';

const DEFAULT_CURATORS = ['niallon11', 'bozz', 'talesfrmthecrypt', 'ablaze'];

const mutationSchema = z.object({
  curator: z
    .string()
    .min(1, 'Curator username is required')
    .regex(/^[a-z0-9._-]+$/, 'Invalid Hive username'),
});

/**
 * GET /api/admin/curators - List curators
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const user = await getAuthenticatedUserFromSession(request);
  if (!user || !isAdminAccount(user.username)) {
    return forbiddenError('Admin access required', ctx.requestId);
  }

  try {
    const curators = await getCuratorsFromDb();
    return NextResponse.json({ success: true, curators });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * POST /api/admin/curators - Add a curator
 */
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const user = await getAuthenticatedUserFromSession(request);
  if (!user || !isAdminAccount(user.username)) {
    return forbiddenError('Admin access required', ctx.requestId);
  }

  try {
    const body = await request.json();
    const parseResult = mutationSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { curator } = parseResult.data;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const curators = await getCuratorsFromDb();

    if (curators.includes(curator)) {
      return NextResponse.json(
        { success: false, error: `${curator} is already a curator` },
        { status: 409 }
      );
    }

    curators.push(curator);
    try {
      await adminDb
        .doc(CURATORS_DOC)
        .set(
          { accounts: curators, updatedAt: new Date().toISOString(), updatedBy: user.username },
          { merge: true }
        );
    } catch (writeError) {
      const msg = writeError instanceof Error ? writeError.message : String(writeError);
      if (msg.includes('credentials') || msg.includes('authentication')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local.',
          },
          { status: 503 }
        );
      }
      throw writeError;
    }

    return NextResponse.json({ success: true, curators });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * DELETE /api/admin/curators - Remove a curator
 */
export async function DELETE(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  const user = await getAuthenticatedUserFromSession(request);
  if (!user || !isAdminAccount(user.username)) {
    return forbiddenError('Admin access required', ctx.requestId);
  }

  try {
    const body = await request.json();
    const parseResult = mutationSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { curator } = parseResult.data;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const curators = await getCuratorsFromDb();
    const updated = curators.filter((c) => c !== curator);

    if (updated.length === curators.length) {
      return NextResponse.json(
        { success: false, error: `${curator} is not a curator` },
        { status: 404 }
      );
    }

    try {
      await adminDb
        .doc(CURATORS_DOC)
        .set(
          { accounts: updated, updatedAt: new Date().toISOString(), updatedBy: user.username },
          { merge: true }
        );
    } catch (writeError) {
      const msg = writeError instanceof Error ? writeError.message : String(writeError);
      if (msg.includes('credentials') || msg.includes('authentication')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local.',
          },
          { status: 503 }
        );
      }
      throw writeError;
    }

    return NextResponse.json({ success: true, curators: updated });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * Get curators from Firestore, falling back to defaults
 */
async function getCuratorsFromDb(): Promise<string[]> {
  const adminDb = getAdminDb();
  if (!adminDb) return [...DEFAULT_CURATORS];

  try {
    const snap = await adminDb.doc(CURATORS_DOC).get();
    if (snap.exists) {
      const data = snap.data();
      if (Array.isArray(data?.accounts) && data.accounts.length > 0) {
        return data.accounts as string[];
      }
    }
  } catch (e) {
    console.warn('[Curators] Failed to read from Firestore, using defaults', e);
  }

  return [...DEFAULT_CURATORS];
}
