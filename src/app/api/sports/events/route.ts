import { NextRequest, NextResponse } from 'next/server';

interface SportsEvent {
  id: string;
  name: string;
  date: string;
  icon: string;
  sport: string;
  league?: string;
  teams?: {
    home: string;
    away: string;
  };
  venue?: string;
  status: 'upcoming' | 'live' | 'finished';
}

interface EventsCache {
  data: SportsEvent[] | null;
  liveEventIds: Set<string>;
  timestamp: number;
  expiresAt: number;
}

// TheSportsDB API response types
interface TheSportsDBEvent {
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

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let eventsCache: EventsCache = {
  data: null,
  liveEventIds: new Set(),
  timestamp: 0,
  expiresAt: 0
};

// Sport configuration with league IDs and icons
const SPORTS_CONFIG = {
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
    ]
  },
  nfl: {
    icon: '🏈',
    sportName: 'American Football',
    liveSportKey: 'Football',
    leagues: [
      { id: '4391', name: 'NFL' }
    ]
  },
  tennis: {
    icon: '🎾',
    sportName: 'Tennis',
    liveSportKey: 'Tennis',
    leagues: [
      { id: '4394', name: 'ATP' }
    ]
  },
  golf: {
    icon: '⛳',
    sportName: 'Golf',
    liveSportKey: 'Golf',
    leagues: [
      { id: '4342', name: 'PGA Tour' }
    ]
  }
};

const API_KEY = process.env.THESPORTSDB_API_KEY || '123'; // '123' is the free test key
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

/**
 * Fetch upcoming events for a specific league
 */
async function fetchLeagueEvents(leagueId: string): Promise<TheSportsDBEvent[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/eventsnextleague.php?id=${leagueId}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );
    
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

/**
 * Fetch live events for a specific sport
 */
async function fetchLiveEvents(sportKey: string): Promise<Set<string>> {
  const liveIds = new Set<string>();
  
  try {
    const response = await fetch(
      `${BASE_URL}/livescore.php?s=${sportKey}`,
      { cache: 'no-store' } // Always fetch fresh live data
    );
    
    if (!response.ok) {
      return liveIds;
    }
    
    const data: TheSportsDBLiveResponse = await response.json();
    
    if (data.events) {
      data.events.forEach(event => {
        liveIds.add(event.idEvent);
      });
    }
  } catch (error) {
    console.error(`Error fetching live events for ${sportKey}:`, error);
  }
  
  return liveIds;
}

/**
 * Parse event date/time into a Date object
 */
function parseEventDateTime(dateStr: string, timeStr: string): Date {
  // TheSportsDB format: dateEvent = "2024-01-17", strTime = "20:00:00"
  const dateTime = `${dateStr}T${timeStr || '00:00:00'}Z`;
  return new Date(dateTime);
}

/**
 * Convert TheSportsDB event to our SportsEvent format
 */
function convertToSportsEvent(
  event: TheSportsDBEvent,
  sportConfig: { icon: string; sportName: string },
  liveEventIds: Set<string>
): SportsEvent {
  const eventDate = parseEventDateTime(event.dateEvent, event.strTime);
  const now = new Date();
  
  // Determine status
  let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
  
  if (liveEventIds.has(event.idEvent)) {
    status = 'live';
  } else if (event.strStatus === 'Match Finished' || event.strStatus === 'FT') {
    status = 'finished';
  } else if (eventDate < now) {
    // Event started but not in live feed - might be finished
    const hoursElapsed = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > 3) {
      status = 'finished';
    } else {
      // Could be live, mark as upcoming for display purposes
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
      away: event.strAwayTeam
    },
    venue: event.strVenue,
    status
  };
}

/**
 * Fetch all events from TheSportsDB
 */
async function fetchAllEvents(): Promise<{ events: SportsEvent[]; liveEventIds: Set<string> }> {
  const allEvents: SportsEvent[] = [];
  const allLiveIds = new Set<string>();
  
  // Fetch live events for all sports first
  const livePromises = Object.values(SPORTS_CONFIG).map(config => 
    fetchLiveEvents(config.liveSportKey)
  );
  const liveResults = await Promise.all(livePromises);
  liveResults.forEach(ids => {
    ids.forEach(id => allLiveIds.add(id));
  });
  
  // Fetch upcoming events for all leagues
  const fetchPromises: Promise<{ events: TheSportsDBEvent[]; config: typeof SPORTS_CONFIG.football }>[] = [];
  
  for (const [, sportConfig] of Object.entries(SPORTS_CONFIG)) {
    for (const league of sportConfig.leagues) {
      fetchPromises.push(
        fetchLeagueEvents(league.id).then(events => ({
          events,
          config: sportConfig
        }))
      );
    }
  }
  
  const results = await Promise.all(fetchPromises);
  
  for (const { events, config } of results) {
    for (const event of events) {
      const sportsEvent = convertToSportsEvent(event, config, allLiveIds);
      allEvents.push(sportsEvent);
    }
  }
  
  return { events: allEvents, liveEventIds: allLiveIds };
}

/**
 * Filter events to next 24 hours and exclude finished events
 */
function filterEvents(events: SportsEvent[]): SportsEvent[] {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return events.filter(event => {
    // Exclude finished events
    if (event.status === 'finished') {
      return false;
    }
    
    const eventDate = new Date(event.date);
    
    // Include live events regardless of time
    if (event.status === 'live') {
      return true;
    }
    
    // Include upcoming events within next 24 hours
    return eventDate >= now && eventDate <= in24Hours;
  });
}

/**
 * Sort events: live first, then by date
 */
function sortEvents(events: SportsEvent[]): SportsEvent[] {
  return events.sort((a, b) => {
    // Live events first
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    
    // Then sort by date
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.max(1, Math.min(100, isNaN(rawLimit) ? 10 : rawLimit));

    const now = Date.now();
    
    // Check if we have valid cached data
    if (eventsCache.data && now < eventsCache.expiresAt) {
      let filteredEvents = filterEvents(eventsCache.data);
      
      // Filter by sport if specified
      if (sport && sport !== 'all') {
        filteredEvents = filteredEvents.filter(event => 
          event.sport.toLowerCase().includes(sport.toLowerCase()) ||
          sport.toLowerCase() === 'football' && event.sport === 'Football' ||
          sport.toLowerCase() === 'nfl' && event.sport === 'American Football'
        );
      }
      
      filteredEvents = sortEvents(filteredEvents);
      filteredEvents = filteredEvents.slice(0, limit);
      
      return NextResponse.json({
        success: true,
        data: filteredEvents,
        cached: true,
        timestamp: eventsCache.timestamp
      });
    }
    
    // Fetch fresh data from TheSportsDB
    const { events, liveEventIds } = await fetchAllEvents();
    
    // Update cache
    eventsCache = {
      data: events,
      liveEventIds,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };
    
    let filteredEvents = filterEvents(events);
    
    // Filter by sport if specified
    if (sport && sport !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.sport.toLowerCase().includes(sport.toLowerCase()) ||
        sport.toLowerCase() === 'football' && event.sport === 'Football' ||
        sport.toLowerCase() === 'nfl' && event.sport === 'American Football'
      );
    }
    
    filteredEvents = sortEvents(filteredEvents);
    filteredEvents = filteredEvents.slice(0, limit);
    
    return NextResponse.json({
      success: true,
      data: filteredEvents,
      cached: false,
      timestamp: now
    });
    
  } catch (error) {
    console.error('Error fetching sports events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch sports events',
        data: []
      },
      { status: 500 }
    );
  }
}
