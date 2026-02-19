/**
 * Server-only sportsbites utilities.
 *
 * This module uses Prisma and must NEVER be imported from
 * client components or shared modules that are bundled for the browser.
 */
import { prisma } from '@/lib/db/prisma';
import { Sportsbite, PollDefinition } from './sportsbites';

function dbRowToSportsbite(row: {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatar: string | null;
  body: string;
  sportCategory: string | null;
  images: string[];
  gifs: string[];
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  poll: unknown;
}): Sportsbite {
  return {
    id: `soft-${row.id}`,
    author: row.authorUsername,
    permlink: `soft-${row.id}`,
    body: row.body,
    created: row.createdAt.toISOString().replace('T', ' ').replace('Z', ''),
    net_votes: row.likeCount || 0,
    children: row.commentCount || 0,
    pending_payout_value: '0.000 HBD',
    active_votes: [],
    sportCategory: row.sportCategory ?? undefined,
    images: row.images,
    gifs: row.gifs,
    source: 'soft',
    softId: row.id,
    authorDisplayName: row.authorDisplayName ?? undefined,
    authorAvatar: row.authorAvatar ?? undefined,
    poll: row.poll as PollDefinition | undefined,
  };
}

/**
 * Fetch soft sportsbites from the database (server-side only, uses Prisma).
 * Returns Sportsbite[] for easy merging with Hive sportsbites.
 */
export async function fetchSoftSportsbites(options: {
  limit?: number;
  author?: string;
}): Promise<Sportsbite[]> {
  try {
    const { limit = 200, author } = options;

    const where: Record<string, unknown> = { isDeleted: false };
    if (author) where.authorUsername = author;

    const rows = await prisma.sportsbite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map(dbRowToSportsbite);
  } catch (error) {
    console.error('[fetchSoftSportsbites] Error:', error);
    return [];
  }
}
