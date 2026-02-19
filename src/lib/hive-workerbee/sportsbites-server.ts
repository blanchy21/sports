/**
 * Server-only sportsbites utilities.
 *
 * This module imports firebase-admin and must NEVER be imported from
 * client components or shared modules that are bundled for the browser.
 */
import { getAdminDb } from '@/lib/firebase/admin';
import { Sportsbite, PollDefinition } from './sportsbites';

interface SoftSportsbiteDoc {
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  body: string;
  sportCategory?: string;
  images?: string[];
  gifs?: string[];
  createdAt: { toDate: () => Date } | Date;
  likeCount?: number;
  commentCount?: number;
  poll?: PollDefinition;
}

function softDocToSportsbite(docId: string, data: SoftSportsbiteDoc): Sportsbite {
  const createdAt =
    typeof (data.createdAt as { toDate?: () => Date })?.toDate === 'function'
      ? (data.createdAt as { toDate: () => Date }).toDate()
      : new Date(data.createdAt as unknown as string);

  return {
    id: `soft-${docId}`,
    author: data.authorUsername,
    permlink: `soft-${docId}`,
    body: data.body,
    created: createdAt.toISOString().replace('T', ' ').replace('Z', ''),
    net_votes: data.likeCount || 0,
    children: data.commentCount || 0,
    pending_payout_value: '0.000 HBD',
    active_votes: [],
    sportCategory: data.sportCategory,
    images: data.images,
    gifs: data.gifs,
    source: 'soft',
    softId: docId,
    authorDisplayName: data.authorDisplayName,
    authorAvatar: data.authorAvatar,
    poll: data.poll,
  };
}

/**
 * Fetch soft sportsbites from Firebase (server-side only, uses Admin SDK).
 * Returns Sportsbite[] for easy merging with Hive sportsbites.
 */
export async function fetchSoftSportsbites(options: {
  limit?: number;
  author?: string;
}): Promise<Sportsbite[]> {
  try {
    const db = getAdminDb();
    if (!db) return [];

    const { limit = 200, author } = options;

    let query = db
      .collection('soft_sportsbites')
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (author) {
      query = db
        .collection('soft_sportsbites')
        .where('isDeleted', '==', false)
        .where('authorUsername', '==', author)
        .orderBy('createdAt', 'desc')
        .limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => softDocToSportsbite(doc.id, doc.data() as SoftSportsbiteDoc));
  } catch (error) {
    console.error('[fetchSoftSportsbites] Error:', error);
    return [];
  }
}
