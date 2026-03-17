/**
 * ESPN API client — shared module.
 *
 * Provides functions to fetch upcoming, live, and finished sports events from
 * ESPN's public scoreboard API. Used by the events API route and match-thread
 * cron jobs.
 */

import { SportsEvent, MatchDetail, MatchEvent, MatchStat, MatchLineup } from '@/types/sports';

// -----------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------

export const SPORTS_CONFIG = {
  football: {
    icon: '\u26BD',
    sportName: 'Football',
    espnSport: 'soccer',
    leagues: [
      { slug: 'eng.1', name: 'Premier League' },
      { slug: 'uefa.champions', name: 'Champions League' },
      { slug: 'esp.1', name: 'La Liga' },
      { slug: 'ita.1', name: 'Serie A' },
      { slug: 'ger.1', name: 'Bundesliga' },
    ],
  },
  nfl: {
    icon: '\uD83C\uDFC8',
    sportName: 'American Football',
    espnSport: 'football',
    leagues: [{ slug: 'nfl', name: 'NFL' }],
  },
  tennis: {
    icon: '\uD83C\uDFBE',
    sportName: 'Tennis',
    espnSport: 'tennis',
    leagues: [{ slug: 'atp', name: 'ATP' }],
  },
  golf: {
    icon: '\u26F3',
    sportName: 'Golf',
    espnSport: 'golf',
    leagues: [{ slug: 'pga', name: 'PGA Tour' }],
  },
};

// -----------------------------------------------------------------------
// ESPN API types
// -----------------------------------------------------------------------

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: {
    displayName: string;
  };
  score?: string;
}

interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  endDate?: string;
  // Tennis/golf tournaments may omit competitions entirely
  competitions?: {
    competitors: ESPNCompetitor[];
    venue?: { fullName: string };
    status: {
      type: {
        state: 'pre' | 'in' | 'post';
        shortDetail?: string;
      };
      displayClock?: string;
    };
  }[];
  // Tournament-level status (used when competitions is absent)
  status?: {
    type: {
      state: 'pre' | 'in' | 'post';
      shortDetail?: string;
    };
    displayClock?: string;
  };
}

interface ESPNScoreboardResponse {
  events: ESPNEvent[];
  leagues: { name: string }[];
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function espnStateToStatus(state: 'pre' | 'in' | 'post'): SportsEvent['status'] {
  switch (state) {
    case 'in':
      return 'live';
    case 'post':
      return 'finished';
    default:
      return 'upcoming';
  }
}

// -----------------------------------------------------------------------
// Fetching
// -----------------------------------------------------------------------

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

async function fetchLeagueScoreboard(
  espnSport: string,
  leagueSlug: string,
  dateRange: string
): Promise<{ events: ESPNEvent[]; leagueName: string }> {
  const url = `${ESPN_BASE}/${espnSport}/${leagueSlug}/scoreboard?dates=${dateRange}`;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });

    if (!response.ok) {
      console.error(`ESPN: failed to fetch ${espnSport}/${leagueSlug}: ${response.status}`);
      return { events: [], leagueName: '' };
    }

    const data: ESPNScoreboardResponse = await response.json();
    const leagueName = data.leagues?.[0]?.name ?? '';
    return { events: data.events ?? [], leagueName };
  } catch (error) {
    console.error(`ESPN: error fetching ${espnSport}/${leagueSlug}:`, error);
    return { events: [], leagueName: '' };
  }
}

function convertESPNEvent(
  event: ESPNEvent,
  leagueName: string,
  sportConfig: { icon: string; sportName: string; espnSport: string },
  leagueSlug: string
): SportsEvent {
  const comp = event.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === 'home');
  const away = comp?.competitors?.find((c) => c.homeAway === 'away');
  const stateRaw = comp?.status?.type?.state ?? event.status?.type?.state ?? 'pre';
  const status = espnStateToStatus(stateRaw);

  // Extract scores for live / finished events
  const hasScore =
    (stateRaw === 'in' || stateRaw === 'post') && home?.score != null && away?.score != null;
  const score = hasScore ? { home: home!.score!, away: away!.score! } : undefined;

  // Status detail: clock for live (e.g. "45'"), shortDetail for finished (e.g. "FT")
  const compStatus = comp?.status;
  let statusDetail: string | undefined;
  if (stateRaw === 'in' && compStatus?.displayClock) {
    statusDetail = compStatus.displayClock;
  } else if (stateRaw === 'post') {
    statusDetail = compStatus?.type?.shortDetail ?? 'FT';
  }

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    endDate: event.endDate,
    icon: sportConfig.icon,
    sport: sportConfig.sportName,
    league: leagueName,
    leagueSlug,
    espnSport: sportConfig.espnSport,
    teams: home && away ? { home: home.team.displayName, away: away.team.displayName } : undefined,
    venue: comp?.venue?.fullName,
    status,
    score,
    statusDetail,
  };
}

// -----------------------------------------------------------------------
// Public API (same signatures as before)
// -----------------------------------------------------------------------

export async function fetchAllEvents(): Promise<{
  events: SportsEvent[];
  liveEventIds: Set<string>;
}> {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${formatDate(now)}-${formatDate(end)}`;

  const fetchPromises: Promise<{
    events: ESPNEvent[];
    leagueName: string;
    config: (typeof SPORTS_CONFIG)['football'];
    configLeagueName: string;
    leagueSlug: string;
  }>[] = [];

  for (const sportConfig of Object.values(SPORTS_CONFIG)) {
    for (const league of sportConfig.leagues) {
      fetchPromises.push(
        fetchLeagueScoreboard(sportConfig.espnSport, league.slug, dateRange).then(
          ({ events, leagueName }) => ({
            events,
            leagueName,
            config: sportConfig,
            configLeagueName: league.name,
            leagueSlug: league.slug,
          })
        )
      );
    }
  }

  const results = await Promise.all(fetchPromises);

  const allEvents: SportsEvent[] = [];
  const liveEventIds = new Set<string>();

  for (const { events, leagueName, config, configLeagueName, leagueSlug } of results) {
    const displayLeague = leagueName || configLeagueName;
    for (const event of events) {
      const sportsEvent = convertESPNEvent(event, displayLeague, config, leagueSlug);
      allEvents.push(sportsEvent);
      if (sportsEvent.status === 'live') {
        liveEventIds.add(sportsEvent.id);
      }
    }
  }

  return { events: allEvents, liveEventIds };
}

/**
 * Fetch events with a broader date range for settlement purposes.
 * Looks back 3 days to catch recently finished events that auto-settlement
 * needs to resolve, plus 7 days forward for upcoming events.
 */
export async function fetchEventsForSettlement(): Promise<{
  events: SportsEvent[];
  liveEventIds: Set<string>;
}> {
  const now = new Date();
  const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${formatDate(start)}-${formatDate(end)}`;

  const fetchPromises: Promise<{
    events: ESPNEvent[];
    leagueName: string;
    config: (typeof SPORTS_CONFIG)['football'];
    configLeagueName: string;
    leagueSlug: string;
  }>[] = [];

  for (const sportConfig of Object.values(SPORTS_CONFIG)) {
    for (const league of sportConfig.leagues) {
      fetchPromises.push(
        fetchLeagueScoreboard(sportConfig.espnSport, league.slug, dateRange).then(
          ({ events, leagueName }) => ({
            events,
            leagueName,
            config: sportConfig,
            configLeagueName: league.name,
            leagueSlug: league.slug,
          })
        )
      );
    }
  }

  const results = await Promise.all(fetchPromises);

  const allEvents: SportsEvent[] = [];
  const liveEventIds = new Set<string>();

  for (const { events, leagueName, config, configLeagueName, leagueSlug } of results) {
    const displayLeague = leagueName || configLeagueName;
    for (const event of events) {
      const sportsEvent = convertESPNEvent(event, displayLeague, config, leagueSlug);
      allEvents.push(sportsEvent);
      if (sportsEvent.status === 'live') {
        liveEventIds.add(sportsEvent.id);
      }
    }
  }

  return { events: allEvents, liveEventIds };
}

/**
 * Fetch ESPN events and return a map keyed by event ID.
 * Used by the auto-settlement cron to look up match results.
 * Uses a broader date range (3 days back) to catch recently finished events.
 */
export async function fetchEventsByIds(eventIds: string[]): Promise<Map<string, SportsEvent>> {
  if (eventIds.length === 0) return new Map();

  const { events } = await fetchEventsForSettlement();
  const map = new Map<string, SportsEvent>();

  const idSet = new Set(eventIds);
  for (const event of events) {
    if (idSet.has(event.id)) {
      map.set(event.id, event);
    }
  }

  return map;
}

export function filterEvents(events: SportsEvent[]): SportsEvent[] {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return events.filter((event) => {
    if (event.status === 'finished') return false;
    if (event.status === 'live') return true;

    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= in7Days;
  });
}

export function sortEvents(events: SportsEvent[]): SportsEvent[] {
  return [...events].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

export function filterBySport(events: SportsEvent[], sport: string): SportsEvent[] {
  return events.filter(
    (event) =>
      event.sport.toLowerCase().includes(sport.toLowerCase()) ||
      (sport.toLowerCase() === 'football' && event.sport === 'Football') ||
      (sport.toLowerCase() === 'nfl' && event.sport === 'American Football')
  );
}

// -----------------------------------------------------------------------
// ESPN Summary (match detail) — soccer only
// -----------------------------------------------------------------------

interface ESPNKeyEvent {
  type: { text: string } | string;
  clock?: { displayValue: string } | string;
  team?: { displayName: string };
  participants?: { athlete: { displayName: string } }[];
  scoringPlay?: boolean;
  text?: string;
  shortText?: string;
}

interface ESPNRosterEntry {
  athlete: { displayName: string };
  jersey: string;
  position: { displayName: string } | string;
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
}

interface ESPNRoster {
  homeAway: 'home' | 'away';
  team: { displayName: string };
  roster: ESPNRosterEntry[];
  formation?: string;
}

interface ESPNBoxscoreTeam {
  homeAway: 'home' | 'away';
  statistics: { name: string; displayName: string; displayValue: string }[];
}

interface ESPNSummaryResponse {
  keyEvents?: ESPNKeyEvent[];
  boxscore?: { teams?: ESPNBoxscoreTeam[] };
  rosters?: ESPNRoster[];
}

function parseKeyEventType(ke: ESPNKeyEvent): MatchEvent['type'] | null {
  const raw = typeof ke.type === 'string' ? ke.type : (ke.type?.text ?? '');
  const lower = raw.toLowerCase();

  if (ke.scoringPlay || lower.includes('goal')) return 'goal';
  if (lower.includes('red card')) return 'redCard';
  if (lower.includes('yellow card')) return 'yellowCard';
  if (lower.includes('substitution')) return 'substitution';
  return null;
}

function parseKeyEvents(keyEvents: ESPNKeyEvent[], homeTeamName: string): MatchEvent[] {
  const events: MatchEvent[] = [];

  for (const ke of keyEvents) {
    const type = parseKeyEventType(ke);
    if (!type) continue;

    const teamName = ke.team?.displayName ?? '';
    const team: 'home' | 'away' = teamName === homeTeamName ? 'home' : 'away';
    const clock = typeof ke.clock === 'string' ? ke.clock : (ke.clock?.displayValue ?? '');
    const participants = ke.participants ?? [];

    const typeText = typeof ke.type === 'string' ? ke.type : (ke.type?.text ?? '');

    const event: MatchEvent = {
      type,
      clock,
      team,
      teamName,
      playerName: participants[0]?.athlete?.displayName ?? '',
    };

    if (type === 'goal') {
      if (participants[1]) event.assistName = participants[1].athlete.displayName;
      event.isPenalty = typeText.toLowerCase().includes('penalty');
      event.isOwnGoal = typeText.toLowerCase().includes('own goal');
    }

    if (type === 'substitution' && participants[1]) {
      // participants[0] = player coming in, participants[1] = player going out
      event.playerName = participants[1].athlete.displayName; // player going out
      event.replacedBy = participants[0].athlete.displayName; // player coming in
    }

    events.push(event);
  }

  return events;
}

/** Display-friendly stat names */
const STAT_DISPLAY_NAMES: Record<string, string> = {
  possessionPct: 'Possession',
  totalShots: 'Total Shots',
  shotsOnTarget: 'Shots on Target',
  wonCorners: 'Corners',
  foulsCommitted: 'Fouls',
  offsides: 'Offsides',
  yellowCards: 'Yellow Cards',
  redCards: 'Red Cards',
  saves: 'Saves',
  totalPasses: 'Passes',
  passPct: 'Pass Accuracy',
  accuratePasses: 'Accurate Passes',
};

function formatStatValue(name: string, displayValue: string): string {
  if (name === 'possessionPct') return `${displayValue}%`;
  if (name === 'passPct') return `${Math.round(parseFloat(displayValue) * 100)}%`;
  return displayValue;
}

function parseBoxscoreStats(teams: ESPNBoxscoreTeam[]): MatchStat[] {
  const homeTeam = teams.find((t) => t.homeAway === 'home');
  const awayTeam = teams.find((t) => t.homeAway === 'away');
  if (!homeTeam || !awayTeam) return [];

  const homeMap = new Map(homeTeam.statistics.map((s) => [s.name, s]));
  const stats: MatchStat[] = [];

  for (const awayStat of awayTeam.statistics) {
    const homeStat = homeMap.get(awayStat.name);
    if (!homeStat) continue;

    // Build human-readable display name; fall back to camelCase → Title Case
    const displayName =
      STAT_DISPLAY_NAMES[awayStat.name] ??
      awayStat.displayName ??
      awayStat.name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

    stats.push({
      name: awayStat.name,
      displayName,
      home: formatStatValue(awayStat.name, homeStat.displayValue),
      away: formatStatValue(awayStat.name, awayStat.displayValue),
    });
  }

  return stats;
}

function parseRoster(roster: ESPNRoster): MatchLineup {
  return {
    formation: roster.formation,
    teamName: roster.team.displayName,
    players: roster.roster.map((p) => ({
      name: p.athlete.displayName,
      jersey: p.jersey,
      position: typeof p.position === 'string' ? p.position : (p.position?.displayName ?? ''),
      isStarter: p.starter,
      subbedIn:
        p.subbedIn === true ||
        (p.subbedIn as unknown as { didSub: boolean })?.didSub === true ||
        undefined,
      subbedOut:
        p.subbedOut === true ||
        (p.subbedOut as unknown as { didSub: boolean })?.didSub === true ||
        undefined,
    })),
  };
}

/**
 * Fetch detailed match data from ESPN summary endpoint.
 * Soccer only — returns null for non-soccer or on API failure.
 */
export async function fetchEventSummary(
  espnSport: string,
  leagueSlug: string,
  eventId: string,
  isLive: boolean
): Promise<MatchDetail | null> {
  if (espnSport !== 'soccer') return null;

  const url = `${ESPN_BASE}/${espnSport}/${leagueSlug}/summary?event=${eventId}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: isLive ? 30 : 300 },
    });

    if (!response.ok) {
      console.error(
        `ESPN summary: failed ${espnSport}/${leagueSlug}/${eventId}: ${response.status}`
      );
      return null;
    }

    const data: ESPNSummaryResponse = await response.json();

    // Determine home team name from rosters
    const homeRoster = data.rosters?.find((r) => r.homeAway === 'home');
    const awayRoster = data.rosters?.find((r) => r.homeAway === 'away');
    const homeTeamName = homeRoster?.team?.displayName ?? '';

    const events = parseKeyEvents(data.keyEvents ?? [], homeTeamName);
    const stats = parseBoxscoreStats(data.boxscore?.teams ?? []);

    return {
      events,
      stats,
      homeLineup: homeRoster ? parseRoster(homeRoster) : null,
      awayLineup: awayRoster ? parseRoster(awayRoster) : null,
    };
  } catch (error) {
    console.error(`ESPN summary: error ${espnSport}/${leagueSlug}/${eventId}:`, error);
    return null;
  }
}
