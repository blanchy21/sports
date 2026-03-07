/**
 * Contest System Types
 */

import type { ContestStatus } from '@/generated/prisma/client';

// ============================================================================
// World Cup Fantasy types
// ============================================================================

export interface WorldCupPick {
  teamCode: string;
  pot: number;
  multiplier: number;
}

export interface WorldCupEntryData {
  picks: WorldCupPick[];
  tieBreaker: number;
}

// ============================================================================
// Golf Fantasy types
// ============================================================================

export interface GolfFantasyPick {
  golferCode: string;
  odds: number;
}

export interface GolfFantasyEntryData {
  picks: GolfFantasyPick[];
  tieBreaker: number;
}

// ============================================================================
// API response types
// ============================================================================

export interface ContestResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  contestType: string;
  status: ContestStatus;
  coverImage: string | null;
  rules: string;
  entryFee: number;
  maxEntries: number | null;
  platformFeePct: number;
  creatorFeePct: number;
  prizePool: number;
  prizeModel: string;
  entryCount: number;
  registrationOpens: string;
  registrationCloses: string;
  startsAt: string;
  endsAt: string | null;
  creatorUsername: string;
  typeConfig: unknown;
  interestCount: number;
  isInterested?: boolean;
  userEntry?: ContestEntryResponse | null;
}

export interface ContestEntryResponse {
  id: string;
  username: string;
  entryData: unknown;
  totalScore: number;
  rank: number | null;
  createdAt: string;
}

export interface ContestLeaderboardEntry {
  rank: number;
  username: string;
  totalScore: number;
  entryData?: unknown;
}

export interface ContestTeamResponse {
  id: string;
  name: string;
  code: string;
  pot: number;
  flagUrl: string | null;
  groupLetter: string | null;
  eliminated: boolean;
  odds?: number;
}

export interface ContestMatchResponse {
  id: string;
  matchNumber: number;
  round: string;
  groupLetter: string | null;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: string;
  resultEnteredAt: string | null;
}

// ============================================================================
// Scoring types
// ============================================================================

export interface MatchResult {
  matchNumber: number;
  round: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number;
  awayScore: number;
}

export interface TeamProgression {
  teamCode: string;
  highestRound: string;
  isChampion: boolean;
  isRunnerUp: boolean;
}

// ============================================================================
// Entry token types
// ============================================================================

export interface ContestEntryTokenData {
  contestId: string;
  username: string;
  amount: number;
}
