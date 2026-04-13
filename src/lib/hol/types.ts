export type {
  HolEntryStatus,
  HolGuess,
  HolPickResult,
  HolRoundStatus,
  HolStatus,
} from './constants';
import type {
  HolEntryStatus,
  HolGuess,
  HolPickResult,
  HolRoundStatus,
  HolStatus,
} from './constants';

export interface HolMatch {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // ISO
  homeGoals?: number | null;
  awayGoals?: number | null;
  postponed?: boolean;
}

export interface HolCompetitionDto {
  id: string;
  contestSlug: string;
  status: HolStatus;
  currentRound: number;
  totalRoundsPlanned: number;
  buyBackCostMedals: number;
  maxBuyBacks: number;
  tieRule: string;
  startsAt: string;
  endsAt: string | null;
}

export interface HolRoundDto {
  id: string;
  competitionId: string;
  roundNumber: number;
  status: HolRoundStatus;
  deadline: string;
  baselineTotal: number;
  actualTotal: number | null;
  matches: HolMatch[];
  resolvedAt: string | null;
}

export interface HolEntryDto {
  id: string;
  competitionId: string;
  username: string;
  status: HolEntryStatus;
  buyBacksUsed: number;
  eliminatedRound: number | null;
  finalRank: number | null;
  prizeAwarded: number | null;
  joinedAt: string;
}

export interface HolPickDto {
  id: string;
  entryId: string;
  roundNumber: number;
  guess: HolGuess;
  result: HolPickResult;
  submittedAt: string;
}

export interface HolRoundResolution {
  actualTotal: number;
  baselineTotal: number;
}

export interface HolEntryDiff {
  entryId: string;
  username: string;
  pickResult: HolPickResult;
  newStatus: HolEntryStatus;
  eliminatedRound?: number;
}

export interface HolLeaderboardEntry {
  username: string;
  status: HolEntryStatus;
  buyBacksUsed: number;
  eliminatedRound: number | null;
  rank: number;
}
