/**
 * ESPN API client — shared module.
 *
 * Provides functions to fetch upcoming, live, and finished sports events from
 * ESPN's public scoreboard API. Used by the events API route and match-thread
 * cron jobs.
 */

import { SportsEvent } from '@/types/sports';

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
}

interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  competitions: {
    competitors: ESPNCompetitor[];
    venue?: { fullName: string };
    status: {
      type: {
        state: 'pre' | 'in' | 'post';
      };
    };
  }[];
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
  sportConfig: { icon: string; sportName: string }
): SportsEvent {
  const comp = event.competitions[0];
  const home = comp?.competitors?.find((c) => c.homeAway === 'home');
  const away = comp?.competitors?.find((c) => c.homeAway === 'away');
  const status = espnStateToStatus(comp?.status?.type?.state ?? 'pre');

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    icon: sportConfig.icon,
    sport: sportConfig.sportName,
    league: leagueName,
    teams: home && away ? { home: home.team.displayName, away: away.team.displayName } : undefined,
    venue: comp?.venue?.fullName,
    status,
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
          })
        )
      );
    }
  }

  const results = await Promise.all(fetchPromises);

  const allEvents: SportsEvent[] = [];
  const liveEventIds = new Set<string>();

  for (const { events, leagueName, config, configLeagueName } of results) {
    const displayLeague = leagueName || configLeagueName;
    for (const event of events) {
      const sportsEvent = convertESPNEvent(event, displayLeague, config);
      allEvents.push(sportsEvent);
      if (sportsEvent.status === 'live') {
        liveEventIds.add(sportsEvent.id);
      }
    }
  }

  return { events: allEvents, liveEventIds };
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
  return events.sort((a, b) => {
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
