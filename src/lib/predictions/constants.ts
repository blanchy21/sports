/**
 * Prediction Markets Configuration
 *
 * Constants for the prediction bites feature: stakes, fees, limits, and escrow.
 */

export const PREDICTION_CONFIG = {
  /** Minimum stake amount in MEDALS */
  MIN_STAKE: 10,

  /** Maximum stake amount in MEDALS */
  MAX_STAKE: 10000,

  /** Platform fee percentage (10%) */
  PLATFORM_FEE_PCT: 0.1,

  /** Minimum lock time in the future (15 minutes in ms) */
  MIN_LOCK_TIME_MS: 15 * 60 * 1000,

  /** Maximum lock time in the future (30 days in ms) */
  MAX_LOCK_TIME_MS: 30 * 24 * 60 * 60 * 1000,

  /** Minimum outcomes per prediction */
  MIN_OUTCOMES: 2,

  /** Maximum outcomes per prediction */
  MAX_OUTCOMES: 4,

  /** Maximum title length */
  MAX_TITLE_LENGTH: 280,

  /** Maximum outcome label length */
  MAX_OUTCOME_LABEL_LENGTH: 50,

  /** Minimum creator stake amount in MEDALS */
  MIN_CREATOR_STAKE: 25,

  /** Rate limit: max predictions per user per day */
  MAX_PREDICTIONS_PER_DAY: 10,

  /** Stake token expiry (5 minutes in seconds) */
  STAKE_TOKEN_EXPIRY_SECONDS: 300,

  /** Escrow account name on Hive */
  ESCROW_ACCOUNT: 'sp-predictions',

  /** Burn account — all platform fees are sent to null (permanently burned) */
  BURN_ACCOUNT: 'null',

  /** Admin accounts that can settle/void any prediction */
  ADMIN_ACCOUNTS: [
    'niallon11',
    'blanchy',
    'talesfrmthecrypt',
    'bozz',
    'fullcoverbetting',
  ] as readonly string[],
} as const;
