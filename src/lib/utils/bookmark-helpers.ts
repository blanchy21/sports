import type { Sportsbite } from '@/lib/hive-workerbee/shared';
import type { SportsblockPost } from '@/lib/shared/types';

/**
 * Converts a Sportsbite to a SportsblockPost for the bookmark system.
 *
 * Sportsbites lack many HivePost fields, so we fill safe defaults.
 * The single cast here replaces scattered `as unknown as` casts in components.
 */
export function sportsbiteToBookmarkable(
  sportsbite: Sportsbite,
  displayText: string
): SportsblockPost {
  return {
    postType: 'sportsblock',
    isSportsblockPost: true,
    id: 0,
    author: sportsbite.author,
    permlink: sportsbite.permlink,
    title: displayText.substring(0, 50) + (displayText.length > 50 ? '...' : ''),
    body: sportsbite.body,
    created: sportsbite.created,
    last_update: sportsbite.created,
    depth: 1,
    children: sportsbite.children,
    net_votes: sportsbite.net_votes,
    active_votes: sportsbite.active_votes,
    pending_payout_value: sportsbite.pending_payout_value,
    total_pending_payout_value: sportsbite.pending_payout_value,
    curator_payout_value: '0 HBD',
    author_payout_value: '0 HBD',
    max_accepted_payout: '1000000.000 HBD',
    percent_hbd: 10000,
    allow_votes: true,
    allow_curation_rewards: true,
    json_metadata: '{}',
    parent_author: '',
    parent_permlink: '',
    category: '',
    active: sportsbite.created,
    last_payout: '1970-01-01T00:00:00',
    net_rshares: '0',
    abs_rshares: '0',
    vote_rshares: '0',
    children_abs_rshares: '0',
    cashout_time: '1969-12-31T23:59:59',
    max_cashout_time: '1969-12-31T23:59:59',
    total_vote_weight: '0',
    reward_weight: 10000,
    total_payout_value: '0.000 HBD',
    author_rewards: '0',
    root_author: sportsbite.author,
    root_permlink: sportsbite.permlink,
    allow_replies: true,
    beneficiaries: [],
    url: '',
    root_title: '',
    replies: [],
    author_reputation: '0',
    promoted: '0.000 HBD',
    body_length: sportsbite.body.length,
    reblogged_by: [],
  } as unknown as SportsblockPost;
}
