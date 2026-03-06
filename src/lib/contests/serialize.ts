/**
 * Contest Serialization — Prisma models → API responses
 */

import type {
  Contest,
  ContestTeam,
  ContestEntry,
  ContestMatch,
} from '@/generated/prisma/client';
import type {
  ContestResponse,
  ContestEntryResponse,
  ContestTeamResponse,
  ContestMatchResponse,
  ContestLeaderboardEntry,
} from './types';

function toNumber(val: { toNumber(): number } | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === 'number' ? val : val.toNumber();
}

export function serializeContest(
  contest: Contest,
  opts?: {
    userEntry?: ContestEntry | null;
    interestCount?: number;
    isInterested?: boolean;
  }
): ContestResponse {
  return {
    id: contest.id,
    slug: contest.slug,
    title: contest.title,
    description: contest.description,
    contestType: contest.contestType,
    status: contest.status,
    coverImage: contest.coverImage,
    rules: contest.rules,
    entryFee: toNumber(contest.entryFee),
    maxEntries: contest.maxEntries,
    platformFeePct: toNumber(contest.platformFeePct),
    creatorFeePct: toNumber(contest.creatorFeePct),
    prizePool: toNumber(contest.prizePool),
    entryCount: contest.entryCount,
    registrationOpens: contest.registrationOpens.toISOString(),
    registrationCloses: contest.registrationCloses.toISOString(),
    startsAt: contest.startsAt.toISOString(),
    endsAt: contest.endsAt?.toISOString() ?? null,
    creatorUsername: contest.creatorUsername,
    typeConfig: contest.typeConfig,
    interestCount: opts?.interestCount ?? 0,
    isInterested: opts?.isInterested,
    userEntry: opts?.userEntry ? serializeEntry(opts.userEntry) : null,
  };
}

export function serializeEntry(entry: ContestEntry): ContestEntryResponse {
  return {
    id: entry.id,
    username: entry.username,
    entryData: entry.entryData,
    totalScore: toNumber(entry.totalScore),
    rank: entry.rank,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function serializeTeam(team: ContestTeam): ContestTeamResponse {
  const meta = team.metadata as Record<string, unknown> | null;
  return {
    id: team.id,
    name: team.name,
    code: team.code,
    pot: team.pot,
    flagUrl: team.flagUrl,
    groupLetter: team.groupLetter,
    eliminated: team.eliminated,
    ...(meta?.odds != null && { odds: Number(meta.odds) }),
  };
}

export function serializeMatch(match: ContestMatch): ContestMatchResponse {
  return {
    id: match.id,
    matchNumber: match.matchNumber,
    round: match.round,
    groupLetter: match.groupLetter,
    homeTeamCode: match.homeTeamCode,
    awayTeamCode: match.awayTeamCode,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    scheduledAt: match.scheduledAt.toISOString(),
    resultEnteredAt: match.resultEnteredAt?.toISOString() ?? null,
  };
}

export function serializeLeaderboardEntry(
  entry: ContestEntry,
  rank: number
): ContestLeaderboardEntry {
  return {
    rank,
    username: entry.username,
    totalScore: toNumber(entry.totalScore),
    entryData: entry.entryData,
  };
}
