import type { Sportsbite } from '@/lib/hive-workerbee/shared';
import type { DisplayPost } from '@/lib/utils/post-helpers';

/**
 * Converts a Sportsbite to a DisplayPost for the bookmark system.
 * Only maps the fields that UI components actually use.
 */
export function sportsbiteToBookmarkable(sportsbite: Sportsbite, displayText: string): DisplayPost {
  return {
    postType: 'display',
    author: sportsbite.author,
    permlink: sportsbite.permlink,
    title: displayText.substring(0, 50) + (displayText.length > 50 ? '...' : ''),
    body: sportsbite.body,
    tags: [],
    sportCategory: sportsbite.sportCategory,
    created: sportsbite.created,
    net_votes: sportsbite.net_votes,
    children: sportsbite.children,
    pending_payout_value: sportsbite.pending_payout_value,
    active_votes: sportsbite.active_votes,
    authorDisplayName: sportsbite.authorDisplayName,
    authorAvatar: sportsbite.authorAvatar,
    source: sportsbite.source || 'hive',
  };
}
