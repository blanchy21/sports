/**
 * Prediction Markets Type Definitions
 *
 * Shared types for prediction bites: API responses, inputs, and computed data.
 */

import type { PredictionStatus } from '@/generated/prisma/client';

// ============================================================================
// API Response Types
// ============================================================================

/** Serialized outcome for API responses */
export interface PredictionOutcomeResponse {
  id: string;
  label: string;
  totalStaked: number;
  backerCount: number;
  isWinner: boolean;
  /** Pari-mutuel odds multiplier (e.g. 2.5x) */
  odds: number;
  /** Percentage of total pool */
  percentage: number;
}

/** Serialized prediction for API responses (a "PredictionBite") */
export interface PredictionBite {
  id: string;
  creatorUsername: string;
  title: string;
  sportCategory: string | null;
  matchReference: string | null;
  locksAt: string;
  status: PredictionStatus;
  totalPool: number;
  outcomes: PredictionOutcomeResponse[];
  winningOutcomeId: string | null;
  hiveAuthor: string | null;
  hivePermlink: string | null;
  isVoid: boolean;
  voidReason: string | null;
  settledAt: string | null;
  settledBy: string | null;
  createdAt: string;
  /** Current user's stakes (if authenticated) */
  userStakes?: UserStakeInfo[];
  /** Settlement summary (only on settled predictions) */
  settlement?: {
    platformCut: number;
    burnedAmount: number;
    rewardPoolAmount: number;
  };
}

/** User's stake info on a prediction */
export interface UserStakeInfo {
  outcomeId: string;
  amount: number;
  payout: number | null;
  refunded: boolean;
}

// ============================================================================
// Input Types
// ============================================================================

/** Input for creating a new prediction */
export interface CreatePredictionInput {
  title: string;
  outcomes: string[];
  sportCategory?: string;
  matchReference?: string;
  locksAt: string;
  /** Creator's initial stake */
  creatorStake: {
    outcomeIndex: number;
    amount: number;
  };
}

/** Input for placing a stake */
export interface PlaceStakeInput {
  outcomeId: string;
  amount: number;
}

/** Input for settling a prediction */
export interface SettlePredictionInput {
  winningOutcomeId: string;
}

/** Input for voiding a prediction */
export interface VoidPredictionInput {
  reason: string;
}

// ============================================================================
// Computed Types
// ============================================================================

/** Odds calculation result */
export interface PredictionOdds {
  /** Multiplier if this outcome wins (e.g. 2.5) */
  multiplier: number;
  /** Percentage of pool on this outcome */
  percentage: number;
  /** Implied probability */
  impliedProbability: number;
}

/** Single payout in a settlement */
export interface SettlementPayout {
  username: string;
  stakeId: string;
  amount: number;
  payoutAmount: number;
}

/** Full settlement calculation result */
export interface SettlementResult {
  winningOutcomeId: string;
  totalPool: number;
  winningPool: number;
  platformFee: number;
  burnAmount: number;
  rewardAmount: number;
  payouts: SettlementPayout[];
  totalPaid: number;
}

/** Leaderboard entry */
export interface PredictionLeaderboardEntry {
  username: string;
  totalPredictions: number;
  wins: number;
  losses: number;
  totalStaked: number;
  totalWon: number;
  profitLoss: number;
  winRate: number;
}
