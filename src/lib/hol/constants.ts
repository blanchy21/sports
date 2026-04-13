export const HOL_CONTEST_TYPE = 'higher-or-lower';

export const HOL_MATCHES_PER_ROUND = 5;
export const HOL_DEFAULT_MAX_BUYBACKS = 2;

export const HOL_BUYBACK_MEMO_PREFIX = 'hol-buyback';

export type HolStatus = 'upcoming' | 'active' | 'complete' | 'cancelled';
export type HolRoundStatus = 'upcoming' | 'locked' | 'resolved';
export type HolEntryStatus = 'alive' | 'eliminated' | 'winner';
export type HolGuess = 'higher' | 'lower';
export type HolPickResult = 'pending' | 'correct' | 'incorrect' | 'tie';
