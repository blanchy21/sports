/**
 * Server-only match thread utilities.
 *
 * Imports firebase-admin — must NEVER be imported from client components.
 */
import { getAdminDb } from '@/lib/firebase/admin';
import { Sportsbite } from './sportsbites';

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
  matchThreadId?: string;
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
  };
}

/**
 * Fetch soft sportsbites for a specific match thread from Firebase.
 */
export async function fetchSoftMatchThreadBites(
  eventId: string,
  options: { limit?: number } = {}
): Promise<Sportsbite[]> {
  try {
    const db = getAdminDb();
    if (!db) return [];

    const { limit = 200 } = options;

    const snapshot = await db
      .collection('soft_sportsbites')
      .where('isDeleted', '==', false)
      .where('matchThreadId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => softDocToSportsbite(doc.id, doc.data() as SoftSportsbiteDoc));
  } catch (error) {
    console.error('[fetchSoftMatchThreadBites] Error:', error);
    return [];
  }
}
