import { NextRequest, NextResponse } from 'next/server';
import { SportsEvent } from '@/types/sports';
import { fetchAllEvents, filterEvents, filterBySport, sortEvents } from '@/lib/sports/espn';
import { createRequestContext } from '@/lib/api/response';

interface EventsCache {
  data: SportsEvent[] | null;
  liveEventIds: Set<string>;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let eventsCache: EventsCache = {
  data: null,
  liveEventIds: new Set(),
  timestamp: 0,
  expiresAt: 0,
};

const ROUTE = '/api/sports/events';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.max(1, Math.min(100, isNaN(rawLimit) ? 10 : rawLimit));

    const now = Date.now();

    // Check if we have valid cached data
    if (eventsCache.data && now < eventsCache.expiresAt) {
      let filteredEvents = filterEvents(eventsCache.data);

      if (sport && sport !== 'all') {
        filteredEvents = filterBySport(filteredEvents, sport);
      }

      filteredEvents = sortEvents(filteredEvents);
      filteredEvents = filteredEvents.slice(0, limit);

      return NextResponse.json({
        success: true,
        data: filteredEvents,
        cached: true,
        timestamp: eventsCache.timestamp,
      });
    }

    // Fetch fresh data from ESPN
    const { events, liveEventIds } = await fetchAllEvents();

    // Update cache
    eventsCache = {
      data: events,
      liveEventIds,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    };

    let filteredEvents = filterEvents(events);

    if (sport && sport !== 'all') {
      filteredEvents = filterBySport(filteredEvents, sport);
    }

    filteredEvents = sortEvents(filteredEvents);
    filteredEvents = filteredEvents.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: filteredEvents,
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
