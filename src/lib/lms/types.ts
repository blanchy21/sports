import type { PLTeam } from './teams';

/** Fixture shape stored as JSON in LmsGameweek.fixtures */
export interface LmsFixture {
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // ISO 8601
  homeGoals: number | null;
  awayGoals: number | null;
  postponed: boolean;
}

/** Competition status values */
export type LmsCompetitionStatus = 'open' | 'picking' | 'locked' | 'results' | 'complete';

/** Entry status values */
export type LmsEntryStatus = 'alive' | 'eliminated' | 'winner';

/** Pick result values */
export type LmsPickResult = 'pending' | 'survived' | 'eliminated' | 'postponed';

/** Gameweek status values */
export type LmsGameweekStatus = 'upcoming' | 'picking' | 'locked' | 'complete';

/** API response: competition summary */
export interface LmsCompetitionResponse {
  id: string;
  name: string;
  season: string;
  status: LmsCompetitionStatus;
  currentGameweek: number;
  startGameweek: number;
  isFreeEntry: boolean;
  entryFeeMedals: number;
  prizeHive: number;
  prizeMedals: number;
  totalEntries: number;
  registrationDeadline: string | null;
  winnerUsername: string | null;
  completedAt: string | null;
  currentGameweekData?: LmsGameweekResponse;
  aliveCount?: number;
}

/** API response: gameweek */
export interface LmsGameweekResponse {
  gameweek: number;
  deadline: string;
  status: LmsGameweekStatus;
  survivorsCount: number;
  eliminatedCount: number;
  fixtures: LmsFixture[];
}

/** API response: board entry */
export interface LmsBoardEntry {
  username: string;
  status: LmsEntryStatus;
  eliminatedGameweek: number | null;
  gameweeksSurvived: number;
  currentPick: string | null; // hidden pre-deadline
  hasPicked: boolean;
  lastPick: {
    team: string;
    result: LmsPickResult;
    gameweek: number;
  } | null;
}

/** API response: user's pick + history */
export interface LmsMyPickResponse {
  entry: {
    status: LmsEntryStatus;
    usedTeams: string[];
    eliminatedGameweek: number | null;
  } | null;
  currentPick: {
    teamPicked: string;
    isAutoPick: boolean;
    submittedAt: string;
    result: LmsPickResult;
  } | null;
  history: {
    gameweek: number;
    teamPicked: string;
    isAutoPick: boolean;
    result: LmsPickResult;
  }[];
  availableTeams: PLTeam[];
}

/** Admin resolve request body */
export interface LmsResolveRequest {
  gameweek: number;
  results: {
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
    postponed: boolean;
  }[];
}
