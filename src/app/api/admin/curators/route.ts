/**
 * Admin Curators API Route
 *
 * Manage designated curator accounts.
 * Requires admin account access.
 *
 * NOTE: Currently,curator management is now handled via env vars only.
 * This route provides read access to the current curator list and placeholder
 * add/remove that returns the env-based defaults.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestContext, forbiddenError, validationError } from '@/lib/api/response';
import { isAdminAccount } from '@/lib/admin/config';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getCuratorAccounts } from '@/lib/rewards/curator-rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/admin/curators';

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
    const curators = getCuratorAccounts();
    return NextResponse.json({ success: true, curators });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * POST /api/admin/curators - Add a curator
 *
 * NOTE: Currently,curator list is managed via CURATOR_ACCOUNTS env var.
 * This endpoint validates the request but returns the current env-based list.
 */
export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
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
      const curators = getCuratorAccounts();

      if (curators.includes(curator)) {
        return NextResponse.json(
          { success: false, error: `${curator} is already a curator` },
          { status: 409 }
        );
      }

      // Currently,curator changes require updating the CURATOR_ACCOUNTS env var
      return NextResponse.json(
        {
          success: false,
          error:
            'Curator management requires updating the CURATOR_ACCOUNTS environment variable. Please update it in your deployment settings.',
          curators,
        },
        { status: 501 }
      );
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

/**
 * DELETE /api/admin/curators - Remove a curator
 */
export async function DELETE(request: NextRequest) {
  return withCsrfProtection(request, async () => {
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
      const curators = getCuratorAccounts();

      if (!curators.includes(curator)) {
        return NextResponse.json(
          { success: false, error: `${curator} is not a curator` },
          { status: 404 }
        );
      }

      // Currently,curator changes require updating the CURATOR_ACCOUNTS env var
      return NextResponse.json(
        {
          success: false,
          error:
            'Curator management requires updating the CURATOR_ACCOUNTS environment variable. Please update it in your deployment settings.',
          curators,
        },
        { status: 501 }
      );
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
