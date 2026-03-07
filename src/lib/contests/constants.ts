/**
 * Contest System Configuration
 */

export const CONTEST_CONFIG = {
  /** Reuse the existing predictions escrow account */
  ESCROW_ACCOUNT: 'sp-predictions',

  /** Entry token expiry (5 minutes, same as predictions) */
  ENTRY_TOKEN_EXPIRY_SECONDS: 300,

  /** Default platform fee percentage (10%) */
  DEFAULT_PLATFORM_FEE_PCT: 0.1,

  /** Default creator fee percentage (10%) */
  DEFAULT_CREATOR_FEE_PCT: 0.1,

  /** Prize split of the remaining pool (after platform + creator fees) */
  PRIZE_SPLIT: {
    FIRST: 0.6,
    SECOND: 0.25,
    THIRD: 0.15,
  },

  /** Entry fee limits in MEDALS */
  MIN_ENTRY_FEE: 10,
  MAX_ENTRY_FEE: 100000,

  /** Platform fee destination account */
  PLATFORM_ACCOUNT: 'sportsblock',

  /** Memo prefix for escrow transfers */
  MEMO_PREFIX: 'contest-entry',
} as const;

/** Contest type identifiers */
export const CONTEST_TYPES = {
  WORLD_CUP_FANTASY: 'WORLD_CUP_FANTASY',
  GOLF_FANTASY: 'GOLF_FANTASY',
  LAST_MAN_STANDING: 'LAST_MAN_STANDING',
} as const;

/** World Cup specific config */
export const WORLD_CUP_CONFIG = {
  POTS_COUNT: 4,
  PICKS_PER_POT: 4,
  TOTAL_PICKS: 16,
  MULTIPLIER_MIN: 1,
  MULTIPLIER_MAX: 16,
  TIE_BREAKER_MIN: 0,
  TIE_BREAKER_MAX: 500,

  /** Match rounds in order of progression */
  ROUNDS: [
    'group',
    'round_of_32',
    'round_of_16',
    'quarter_final',
    'semi_final',
    'third_place',
    'final',
  ] as const,

  /** Base scoring rules */
  SCORING: {
    WIN: 3,
    DRAW: 1,
    LOSS: 0,
    GOAL: 1,
  },

  /** Knockout bonus points (base, multiplied by user's coefficient) */
  KNOCKOUT_BONUSES: {
    round_of_32: 2,
    round_of_16: 3,
    quarter_final: 4,
    semi_final: 5,
    runner_up: 6,
    champion: 7,
  } as const,
} as const;

export type WorldCupRound = (typeof WORLD_CUP_CONFIG.ROUNDS)[number];

/** Golf Fantasy specific config */
export const GOLF_FANTASY_CONFIG = {
  PICKS_COUNT: 3,
  MIN_COMBINED_ODDS: 90,
  TIE_BREAKER_MIN: -30,
  TIE_BREAKER_MAX: 10,
} as const;
