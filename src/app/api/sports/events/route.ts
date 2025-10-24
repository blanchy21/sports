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
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
let eventsCache: EventsCache = {
  data: null,
  timestamp: 0,
  expiresAt: 0
};

// Mock upcoming sports events data - in production, this would come from a real sports API
const generateMockEvents = (): SportsEvent[] => {
  const now = new Date();
  const events: SportsEvent[] = [];

  // Generate events for the next 30 days
  for (let i = 0; i < 15; i++) {
    const eventDate = new Date(now.getTime() + (i * 2) * 24 * 60 * 60 * 1000);
    
    const sportsData = [
      { sport: 'Football', icon: '⚽', leagues: ['Premier League', 'Champions League', 'La Liga', 'Serie A'] },
      { sport: 'Basketball', icon: '🏀', leagues: ['NBA', 'EuroLeague', 'NCAA'] },
      { sport: 'Tennis', icon: '🎾', leagues: ['Wimbledon', 'US Open', 'French Open', 'Australian Open'] },
      { sport: 'American Football', icon: '🏈', leagues: ['NFL', 'NCAA'] },
      { sport: 'Baseball', icon: '⚾', leagues: ['MLB', 'World Series'] },
      { sport: 'Hockey', icon: '🏒', leagues: ['NHL', 'Stanley Cup'] },
      { sport: 'Golf', icon: '⛳', leagues: ['PGA Tour', 'Masters', 'US Open'] },
      { sport: 'Rugby', icon: '🏉', leagues: ['Six Nations', 'Rugby World Cup'] },
      { sport: 'Cricket', icon: '🏏', leagues: ['IPL', 'Ashes', 'World Cup'] },
      { sport: 'Boxing', icon: '🥊', leagues: ['Heavyweight', 'Lightweight', 'Welterweight'] },
    ];

    const randomSport = sportsData[Math.floor(Math.random() * sportsData.length)];
    const randomLeague = randomSport.leagues[Math.floor(Math.random() * randomSport.leagues.length)];
    
    events.push({
      id: `event-${i + 1}`,
      name: `${randomLeague} - ${randomSport.sport}`,
      date: eventDate.toISOString(),
      icon: randomSport.icon,
      sport: randomSport.sport,
      league: randomLeague,
      teams: {
        home: `Team ${Math.floor(Math.random() * 20) + 1}`,
        away: `Team ${Math.floor(Math.random() * 20) + 1}`
      },
      venue: `Venue ${Math.floor(Math.random() * 10) + 1}`,
      status: 'upcoming'
    });
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Check if we have valid cached data
    const now = Date.now();
    if (eventsCache.data && now < eventsCache.expiresAt) {
      let filteredEvents = eventsCache.data;
      
      // Filter by sport if specified
      if (sport && sport !== 'all') {
        filteredEvents = filteredEvents.filter(event => 
          event.sport.toLowerCase() === sport.toLowerCase()
        );
      }
      
      // Limit results
      filteredEvents = filteredEvents.slice(0, limit);
      
      return NextResponse.json({
        success: true,
        data: filteredEvents,
        cached: true,
        timestamp: eventsCache.timestamp
      });
    }
    
    // Generate new events data
    const events = generateMockEvents();
    
    // Update cache
    eventsCache = {
      data: events,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };
    
    let filteredEvents = events;
    
    // Filter by sport if specified
    if (sport && sport !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.sport.toLowerCase() === sport.toLowerCase()
      );
    }
    
    // Limit results
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
