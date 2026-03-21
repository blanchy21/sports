import type { IplBbLeaderboardEntry } from './types';

export const GUESS_MIN = 1;
export const GUESS_MAX = 99;

export function calculatePoints(guess: number, actualBoundaries: number): number {
  return guess <= actualBoundaries ? guess : 0;
}

export function isBust(guess: number, actualBoundaries: number): boolean {
  return guess > actualBoundaries;
}

export function validateGuess(guess: number): boolean {
  return Number.isInteger(guess) && guess >= GUESS_MIN && guess <= GUESS_MAX;
}

/** Apply tiebreaking: totalPoints DESC, bustCount ASC, firstSubmittedAt ASC */
export function rankEntries(entries: IplBbLeaderboardEntry[]): IplBbLeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (a.bustCount !== b.bustCount) return a.bustCount - b.bustCount;
      return new Date(a.firstSubmittedAt).getTime() - new Date(b.firstSubmittedAt).getTime();
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** IPL team short codes for display */
export const IPL_TEAMS: Record<string, { name: string; short: string; color: string }> = {
  RCB: { name: 'Royal Challengers Bengaluru', short: 'RCB', color: '#EC1C24' },
  SRH: { name: 'Sunrisers Hyderabad', short: 'SRH', color: '#FF822A' },
  MI: { name: 'Mumbai Indians', short: 'MI', color: '#004BA0' },
  KKR: { name: 'Kolkata Knight Riders', short: 'KKR', color: '#3A225D' },
  RR: { name: 'Rajasthan Royals', short: 'RR', color: '#EA1A85' },
  CSK: { name: 'Chennai Super Kings', short: 'CSK', color: '#FFCB05' },
  DC: { name: 'Delhi Capitals', short: 'DC', color: '#0078BC' },
  GT: { name: 'Gujarat Titans', short: 'GT', color: '#1B2133' },
  PBKS: { name: 'Punjab Kings', short: 'PBKS', color: '#DD1F2D' },
  LSG: { name: 'Lucknow Super Giants', short: 'LSG', color: '#A72056' },
};
