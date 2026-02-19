/**
 * Server-only match thread utilities.
 *
 * Uses Prisma -- must NEVER be imported from client components.
 */
import { prisma } from '@/lib/db/prisma';
import { Sportsbite } from './sportsbites';
import { error as logError } from './logger';

function dbRowToSportsbite(row: {
  id: string;
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
  };
}

/**
 * Fetch soft sportsbites for a specific match thread from the database.
 */
export async function fetchSoftMatchThreadBites(
  eventId: string,
  options: { limit?: number } = {}
): Promise<Sportsbite[]> {
  try {
    const { limit = 200 } = options;

    const rows = await prisma.sportsbite.findMany({
      where: {
        isDeleted: false,
        matchThreadId: eventId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map(dbRowToSportsbite);
  } catch (error) {
    logError(
      'Error fetching soft match thread bites',
      'fetchSoftMatchThreadBites',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}
