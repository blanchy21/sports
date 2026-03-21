export type CompetitionStatus = 'open' | 'active' | 'complete';
export type MatchStatus = 'upcoming' | 'open' | 'locked' | 'resolved' | 'abandoned';

export interface IplBbCompetitionDetail {
  id: string;
  title: string;
  season: string;
  roundNumber: number;
  status: CompetitionStatus;
  dateFrom: string;
  dateTo: string;
  prizeFirst: number;
  prizeSecond: number;
  prizeThird: number;
  totalMatches: number;
  totalEntries: number;
  matches: IplBbMatchDetail[];
}

export interface IplBbMatchDetail {
  id: string;
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  kickoffTime: string;
  status: MatchStatus;
  actualBoundaries: number | null;
  fours: number | null;
  sixes: number | null;
}

export interface IplBbLeaderboardEntry {
  rank: number;
  username: string;
  totalPoints: number;
  bustCount: number;
  hitCount: number;
  submittedCount: number;
  prizeAwarded: number | null;
  firstSubmittedAt: string;
}

export interface IplBbPickWithResult {
  matchId: string;
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  matchStatus: MatchStatus;
  guess: number | null;
  pointsScored: number | null;
  isBust: boolean | null;
  actualBoundaries: number | null;
}

export interface IplBbCompetitionCard {
  id: string;
  title: string;
  status: CompetitionStatus;
  roundNumber: number;
  totalEntries: number;
  totalMatches: number;
  prizeFirst: number;
  prizeSecond: number;
  prizeThird: number;
  dateFrom: string;
  dateTo: string;
  nextOpenMatch: {
    homeTeam: string;
    awayTeam: string;
    kickoffTime: string;
  } | null;
  resolvedMatchCount: number;
}
