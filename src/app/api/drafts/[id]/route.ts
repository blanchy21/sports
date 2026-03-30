import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler, AuthError, ValidationError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/drafts/[id]';

// GET /api/drafts/[id] — get a single draft
export const GET = createApiHandler(ROUTE, async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError('Authentication required');

  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  if (!id) throw new ValidationError('Draft ID required');

  const draft = await prisma.draft.findUnique({ where: { id } });
  if (!draft || draft.userId !== user.userId) {
    throw new ValidationError('Draft not found');
  }

  return NextResponse.json({
    success: true,
    draft: {
      id: draft.id,
      title: draft.title,
      content: draft.content,
      tags: draft.tags,
      sport: draft.sportCategory ?? '',
      imageUrl: draft.featuredImage ?? '',
      communityId: draft.communityId ?? '',
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    },
  });
});

// DELETE /api/drafts/[id] — delete a draft
export const DELETE = createApiHandler(ROUTE, async (request) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError('Authentication required');

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    if (!id) throw new ValidationError('Draft ID required');

    const draft = await prisma.draft.findUnique({ where: { id } });
    if (!draft || draft.userId !== user.userId) {
      throw new ValidationError('Draft not found');
    }

    await prisma.draft.delete({ where: { id } });

    return NextResponse.json({ success: true });
  });
});
