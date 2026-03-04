/**
 * Hive blockchain operation types, vote types, and realtime event types.
 * Leaf module — no internal imports.
 */

// ---------------------------------------------------------------------------
// Wax operation types
// ---------------------------------------------------------------------------

export interface WaxVoteOperation {
  voter: string;
  author: string;
  permlink: string;
  weight: number;
}

export interface WaxCommentOperation {
  parent_author: string;
  parent_permlink: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  extensions?: unknown[];
}

// Posts are essentially comments with specific parent settings
export type WaxPostOperation = WaxCommentOperation;

export interface WaxCommentOptionsOperation {
  author: string;
  permlink: string;
  max_accepted_payout: string;
  percent_hbd: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  extensions: Array<[0, { beneficiaries: Array<{ account: string; weight: number }> }]>;
}

export interface Beneficiary {
  account: string;
  weight: number; // 0-10000 (basis points, so 2000 = 20%)
}

export interface WaxTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  blockNum?: number;
  trxNum?: number;
}

export interface WaxTransferToVestingOperation {
  from: string;
  to: string;
  amount: string; // e.g., "10.000 HIVE"
}

export interface WaxWithdrawVestingOperation {
  account: string;
  vesting_shares: string; // e.g., "10000.000000 VESTS"
}

// ---------------------------------------------------------------------------
// Native transfer operation type
// ---------------------------------------------------------------------------

export interface WaxTransferOperation {
  from: string;
  to: string;
  amount: string; // e.g. "10.000 HIVE" or "5.000 HBD"
  memo: string;
}

// ---------------------------------------------------------------------------
// Reward claiming & delegation operation types
// ---------------------------------------------------------------------------

export interface WaxClaimRewardBalanceOperation {
  account: string;
  reward_hive: string;
  reward_hbd: string;
  reward_vests: string;
}

export interface WaxDelegateVestingSharesOperation {
  delegator: string;
  delegatee: string;
  vesting_shares: string;
}

// ---------------------------------------------------------------------------
// Voting types
// ---------------------------------------------------------------------------

export interface VoteResult {
  success: boolean;
  transactionId?: string;
  confirmed?: boolean;
  error?: string;
}

export interface VoteData {
  voter: string;
  author: string;
  permlink: string;
  weight: number; // 0-100 percentage
}

export interface HiveVote {
  voter: string;
  weight: number;
  rshares: string;
  percent: number;
  reputation: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Realtime event types
// ---------------------------------------------------------------------------

export interface RealtimePostEvent {
  type: 'new_post';
  data: {
    author: string;
    permlink: string;
    title: string;
    body: string;
    created: string;
    sportCategory?: string;
  };
}

export interface RealtimeVoteEvent {
  type: 'new_vote';
  data: {
    voter: string;
    author: string;
    permlink: string;
    weight: number;
    timestamp: string;
  };
}

export interface RealtimeCommentEvent {
  type: 'new_comment';
  data: {
    author: string;
    permlink: string;
    parentAuthor: string;
    parentPermlink: string;
    body: string;
    created: string;
  };
}

export type RealtimeEvent = RealtimePostEvent | RealtimeVoteEvent | RealtimeCommentEvent;

export type RealtimeEventCallback = (event: RealtimeEvent) => void;
