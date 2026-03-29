import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler, ValidationError, AuthError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/drafts';

const saveDraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(500).default(''),
  content: z.string().max(100_000).default(''),
  tags: z.array(z.string()).max(20).default([]),
  sportCategory: z.string().max(100).optional(),
  featuredImage: z.string().url().max(2000).optional().or(z.literal('')),
  communityId: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/drafts — list all drafts for the authenticated user
export const GET = createApiHandler(ROUTE, async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError('Authentication required');

  const drafts = await prisma.draft.findMany({
    where: { userId: user.userId },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    drafts: drafts.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      tags: d.tags,
      sport: d.sportCategory ?? '',
      imageUrl: d.featuredImage ?? '',
      communityId: d.communityId ?? '',
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      wordCount: d.content ? d.content.split(/\s+/).filter((w) => w.length > 0).length : 0,
    })),
  });
});

// POST /api/drafts — create or update a draft
export const POST = createApiHandler(ROUTE, async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError('Authentication required');

  const body = await request.json();
  const parsed = saveDraftSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((e) => e.message).join(', '));
  }

  const { id, title, content, tags, sportCategory, featuredImage, communityId, metadata } =
    parsed.data;

  const draftData = {
    title,
    content,
    tags,
    sportCategory: sportCategory || null,
    featuredImage: featuredImage || null,
    communityId: communityId || null,
    metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
  };

  let draft;

  if (id) {
    // Update existing — verify ownership
    const existing = await prisma.draft.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.userId) {
      throw new ValidationError('Draft not found');
    }
    draft = await prisma.draft.update({
      where: { id },
      data: draftData,
    });
  } else {
    // Create new
    draft = await prisma.draft.create({
      data: {
        userId: user.userId,
        ...draftData,
      },
    });
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
