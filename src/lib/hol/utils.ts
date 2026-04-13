import { HOL_MATCHES_PER_ROUND } from './constants';
import type {
  HolEntryDiff,
  HolEntryDto,
  HolGuess,
  HolLeaderboardEntry,
  HolMatch,
  HolPickDto,
  HolPickResult,
} from './types';

export function sumMatchGoals(matches: HolMatch[]): number {
  return matches.reduce((sum, m) => {
    if (m.postponed) return sum;
    if (m.homeGoals == null || m.awayGoals == null) return sum;
    return sum + m.homeGoals + m.awayGoals;
  }, 0);
}

export function isRoundComplete(matches: HolMatch[]): boolean {
  const playable = matches.filter((m) => !m.postponed);
  if (playable.length === 0) return false;
  return playable.every((m) => m.homeGoals != null && m.awayGoals != null);
}

export function validateRoundMatches(matches: unknown): matches is HolMatch[] {
  if (!Array.isArray(matches) || matches.length !== HOL_MATCHES_PER_ROUND) return false;
  return matches.every(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      typeof (m as HolMatch).league === 'string' &&
      typeof (m as HolMatch).homeTeam === 'string' &&
      typeof (m as HolMatch).awayTeam === 'string' &&
      typeof (m as HolMatch).kickoff === 'string'
  );
}

export function firstKickoff(matches: HolMatch[]): Date | null {
  const times = matches.map((m) => new Date(m.kickoff).getTime()).filter((t) => Number.isFinite(t));
  if (times.length === 0) return null;
  return new Date(Math.min(...times));
}

/**
 * Resolve a single pick against a round result.
 * Tie (actual === baseline) → 'tie' (treated as survive by caller).
 */
export function resolvePickResult(
  guess: HolGuess,
  baselineTotal: number,
  actualTotal: number
): HolPickResult {
  if (actualTotal === baselineTotal) return 'tie';
  const isHigher = actualTotal > baselineTotal;
  const guessedHigher = guess === 'higher';
  return isHigher === guessedHigher ? 'correct' : 'incorrect';
}

/**
 * Compute per-entry status diff after a round resolves.
 * Pure — caller applies in a Prisma transaction.
 *
 * Rules:
 * - Entry not 'alive' → untouched (already eliminated/winner)
 * - No pick submitted → eliminated (missed deadline)
 * - Pick 'correct' or 'tie' → survive
 * - Pick 'incorrect' → eliminated
 */
export function applyRoundResult(
  aliveEntries: Pick<HolEntryDto, 'id' | 'username' | 'status'>[],
  picksByEntryId: Map<string, Pick<HolPickDto, 'guess'>>,
  baselineTotal: number,
  actualTotal: number,
  roundNumber: number
): HolEntryDiff[] {
  const diffs: HolEntryDiff[] = [];
  for (const entry of aliveEntries) {
    if (entry.status !== 'alive') continue;
    const pick = picksByEntryId.get(entry.id);
    if (!pick) {
      diffs.push({
        entryId: entry.id,
        username: entry.username,
        pickResult: 'incorrect',
        newStatus: 'eliminated',
        eliminatedRound: roundNumber,
      });
      continue;
    }
    const result = resolvePickResult(pick.guess, baselineTotal, actualTotal);
    if (result === 'correct' || result === 'tie') {
      diffs.push({
        entryId: entry.id,
        username: entry.username,
        pickResult: result,
        newStatus: 'alive',
      });
    } else {
      diffs.push({
        entryId: entry.id,
        username: entry.username,
        pickResult: 'incorrect',
        newStatus: 'eliminated',
        eliminatedRound: roundNumber,
      });
    }
  }
  return diffs;
}

export interface BuyBackEligibilityInput {
  entryStatus: HolEntryDto['status'];
  buyBacksUsed: number;
  maxBuyBacks: number;
  nextRoundStatus: 'upcoming' | 'locked' | 'resolved' | null;
}

export function canBuyBack(input: BuyBackEligibilityInput): boolean {
  if (input.entryStatus !== 'eliminated') return false;
  if (input.buyBacksUsed >= input.maxBuyBacks) return false;
  return input.nextRoundStatus === 'upcoming';
}

/**
 * Rank entries for leaderboard display.
 * Alive first, then by latest elimination, then fewest buybacks used.
 */
export function rankEntries(
  entries: Pick<
    HolEntryDto,
    'username' | 'status' | 'buyBacksUsed' | 'eliminatedRound' | 'joinedAt'
  >[]
): HolLeaderboardEntry[] {
  const statusWeight: Record<HolEntryDto['status'], number> = {
    winner: 0,
    alive: 1,
    eliminated: 2,
  };
  return [...entries]
    .sort((a, b) => {
      const sw = statusWeight[a.status] - statusWeight[b.status];
      if (sw !== 0) return sw;
      const er = (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0);
      if (er !== 0) return er;
      if (a.buyBacksUsed !== b.buyBacksUsed) return a.buyBacksUsed - b.buyBacksUsed;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    })
    .map((e, i) => ({
      username: e.username,
      status: e.status,
      buyBacksUsed: e.buyBacksUsed,
      eliminatedRound: e.eliminatedRound,
      rank: i + 1,
    }));
}
