import type { HolCompetitionDto, HolEntryDto, HolMatch, HolPickDto, HolRoundDto } from './types';
import type {
  HolEntryStatus,
  HolGuess,
  HolPickResult,
  HolRoundStatus,
  HolStatus,
} from './constants';

type Decimalish = { toNumber: () => number } | number | string;

function toNumber(v: Decimalish | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return v.toNumber();
}

export interface HolCompetitionRow {
  id: string;
  contestSlug: string;
  status: string;
  currentRound: number;
  totalRoundsPlanned: number;
  buyBackCostMedals: Decimalish;
  maxBuyBacks: number;
  tieRule: string;
  startsAt: Date;
  endsAt: Date | null;
}

export interface HolRoundRow {
  id: string;
  competitionId: string;
  roundNumber: number;
  status: string;
  deadline: Date;
  baselineTotal: number;
  actualTotal: number | null;
  matches: unknown;
  resolvedAt: Date | null;
}

export interface HolEntryRow {
  id: string;
  competitionId: string;
  username: string;
  status: string;
  buyBacksUsed: number;
  eliminatedRound: number | null;
  finalRank: number | null;
  prizeAwarded: Decimalish | null;
  joinedAt: Date;
}

export interface HolPickRow {
  id: string;
  entryId: string;
  roundNumber: number;
  guess: string;
  result: string;
  submittedAt: Date;
}

export interface HolBuyBackRow {
  id: string;
  entryId: string;
  roundNumber: number;
  medalsCost: Decimalish;
  txId: string;
  createdAt: Date;
}

export function serializeCompetition(c: HolCompetitionRow): HolCompetitionDto {
  return {
    id: c.id,
    contestSlug: c.contestSlug,
    status: c.status as HolStatus,
    currentRound: c.currentRound,
    totalRoundsPlanned: c.totalRoundsPlanned,
    buyBackCostMedals: toNumber(c.buyBackCostMedals) ?? 0,
    maxBuyBacks: c.maxBuyBacks,
    tieRule: c.tieRule,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt?.toISOString() ?? null,
  };
}

export function serializeRound(r: HolRoundRow): HolRoundDto {
  return {
    id: r.id,
    competitionId: r.competitionId,
    roundNumber: r.roundNumber,
    status: r.status as HolRoundStatus,
    deadline: r.deadline.toISOString(),
    baselineTotal: r.baselineTotal,
    actualTotal: r.actualTotal,
    matches: (r.matches as HolMatch[]) ?? [],
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  };
}

export function serializeEntry(e: HolEntryRow): HolEntryDto {
  return {
    id: e.id,
    competitionId: e.competitionId,
    username: e.username,
    status: e.status as HolEntryStatus,
    buyBacksUsed: e.buyBacksUsed,
    eliminatedRound: e.eliminatedRound,
    finalRank: e.finalRank,
    prizeAwarded: toNumber(e.prizeAwarded),
    joinedAt: e.joinedAt.toISOString(),
  };
}

export function serializePick(p: HolPickRow): HolPickDto {
  return {
    id: p.id,
    entryId: p.entryId,
    roundNumber: p.roundNumber,
    guess: p.guess as HolGuess,
    result: p.result as HolPickResult,
    submittedAt: p.submittedAt.toISOString(),
  };
}

export function serializeBuyBack(b: HolBuyBackRow) {
  return {
    id: b.id,
    entryId: b.entryId,
    roundNumber: b.roundNumber,
    medalsCost: toNumber(b.medalsCost) ?? 0,
    txId: b.txId,
    createdAt: b.createdAt.toISOString(),
  };
}
