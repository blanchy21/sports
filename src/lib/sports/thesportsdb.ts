/**
 * TheSportsDB API client — shared module.
 *
 * Provides functions to fetch upcoming and live sports events from
 * TheSportsDB. Used by the events API route and match-thread cron jobs.
 */

import { SportsEvent } from '@/types/sports';

// -----------------------------------------------------------------------
// TheSportsDB API response types
// -----------------------------------------------------------------------

export interface TheSportsDBEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strLeague: string;
  strSport: string;
  strVenue?: string;
  dateEvent: string;
  strTime: string;
  strStatus?: string;
  strTimestamp?: string;
}

interface TheSportsDBResponse {
  events: TheSportsDBEvent[] | null;
}

interface TheSportsDBLiveEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strLeague: string;
  strSport: string;
  intHomeScore?: string;
  intAwayScore?: string;
  strProgress?: string;
  strStatus?: string;
}

interface TheSportsDBLiveResponse {
  events: TheSportsDBLiveEvent[] | null;
}

// -----------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------

export const SPORTS_CONFIG = {
  football: {
    icon: '⚽',
    sportName: 'Football',
    liveSportKey: 'Soccer',
    leagues: [
      { id: '4328', name: 'Premier League' },
      { id: '4480', name: 'Champions League' },
      { id: '4335', name: 'La Liga' },
      { id: '4332', name: 'Serie A' },
      { id: '4331', name: 'Bundesliga' },
    ],
  },
  nfl: {
    icon: '🏈',
    sportName: 'American Football',
    liveSportKey: 'Football',
    leagues: [{ id: '4391', name: 'NFL' }],
  },
  tennis: {
    icon: '🎾',
    sportName: 'Tennis',
    liveSportKey: 'Tennis',
    leagues: [{ id: '4394', name: 'ATP' }],
  },
  golf: {
    icon: '⛳',
    sportName: 'Golf',
    liveSportKey: 'Golf',
    leagues: [{ id: '4342', name: 'PGA Tour' }],
  },
};

const API_KEY = process.env.THESPORTSDB_API_KEY || '123';
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

// -----------------------------------------------------------------------
// Fetching
// -----------------------------------------------------------------------

export async function fetchLeagueEvents(leagueId: string): Promise<TheSportsDBEvent[]> {
  try {
    const response = await fetch(`${BASE_URL}/eventsnextleague.php?id=${leagueId}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`Failed to fetch league ${leagueId}: ${response.status}`);
      return [];
    }

    const data: TheSportsDBResponse = await response.json();
    return data.events || [];
  } catch (error) {
    console.error(`Error fetching league ${leagueId}:`, error);
    return [];
  }
}

export async function fetchLiveEvents(sportKey: string): Promise<Set<string>> {
  const liveIds = new Set<string>();

  try {
    const response = await fetch(`${BASE_URL}/livescore.php?s=${sportKey}`, {
      cache: 'no-store',
    });

    if (!response.ok) return liveIds;

    const data: TheSportsDBLiveResponse = await response.json();
    if (data.events) {
      data.events.forEach((event) => liveIds.add(event.idEvent));
    }
  } catch (error) {
    console.error(`Error fetching live events for ${sportKey}:`, error);
  }

  return liveIds;
}

// -----------------------------------------------------------------------
// Conversion / filtering / sorting
// -----------------------------------------------------------------------

export function parseEventDateTime(dateStr: string, timeStr: string): Date {
  const dateTime = `${dateStr}T${timeStr || '00:00:00'}Z`;
  return new Date(dateTime);
}

export function convertToSportsEvent(
  event: TheSportsDBEvent,
  sportConfig: { icon: string; sportName: string },
  liveEventIds: Set<string>
): SportsEvent {
  const eventDate = parseEventDateTime(event.dateEvent, event.strTime);
  const now = new Date();

  let status: 'upcoming' | 'live' | 'finished' = 'upcoming';

  if (liveEventIds.has(event.idEvent)) {
    status = 'live';
  } else if (event.strStatus === 'Match Finished' || event.strStatus === 'FT') {
    status = 'finished';
  } else if (eventDate < now) {
    const hoursElapsed = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > 3) {
      status = 'finished';
    } else {
      status = 'upcoming';
    }
  }

  return {
    id: event.idEvent,
    name: event.strEvent,
    date: eventDate.toISOString(),
    icon: sportConfig.icon,
    sport: sportConfig.sportName,
    league: event.strLeague,
    teams: {
      home: event.strHomeTeam,
      away: event.strAwayTeam,
    },
    venue: event.strVenue,
    status,
  };
}

export async function fetchAllEvents(): Promise<{
  events: SportsEvent[];
  liveEventIds: Set<string>;
}> {
  const allEvents: SportsEvent[] = [];
  const allLiveIds = new Set<string>();

  // Fetch live events for all sports first
  const livePromises = Object.values(SPORTS_CONFIG).map((config) =>
    fetchLiveEvents(config.liveSportKey)
  );
  const liveResults = await Promise.all(livePromises);
  liveResults.forEach((ids) => ids.forEach((id) => allLiveIds.add(id)));

  // Fetch upcoming events for all leagues
  const fetchPromises: Promise<{
    events: TheSportsDBEvent[];
    config: (typeof SPORTS_CONFIG)['football'];
  }>[] = [];

  for (const [, sportConfig] of Object.entries(SPORTS_CONFIG)) {
    for (const league of sportConfig.leagues) {
      fetchPromises.push(
        fetchLeagueEvents(league.id).then((events) => ({
          events,
          config: sportConfig,
        }))
      );
    }
  }

  const results = await Promise.all(fetchPromises);

  for (const { events, config } of results) {
    for (const event of events) {
      allEvents.push(convertToSportsEvent(event, config, allLiveIds));
    }
  }

  return { events: allEvents, liveEventIds: allLiveIds };
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
