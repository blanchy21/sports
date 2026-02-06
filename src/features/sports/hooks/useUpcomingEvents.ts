import { useState, useEffect, useCallback } from 'react';
import { SportsEvent, EventsApiResponse } from '@/types';
import { logger } from '@/lib/logger';

interface UseUpcomingEventsOptions {
  sport?: string;
  limit?: number;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseUpcomingEventsReturn {
  events: SportsEvent[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshEvents: () => Promise<void>;
  isRefreshing: boolean;
}

export function useUpcomingEvents(options: UseUpcomingEventsOptions = {}): UseUpcomingEventsReturn {
  const {
    sport,
    limit = 10,
    refreshInterval = 30 * 60 * 1000, // 30 minutes default
    enabled = true,
  } = options;

  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEvents = useCallback(
    async (isRefresh = false) => {
      if (!enabled) return;

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (sport && sport !== 'all') {
          params.append('sport', sport);
        }
        params.append('limit', limit.toString());

        const response = await fetch(`/api/sports/events?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store', // Always fetch fresh data
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: EventsApiResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch events');
        }

        setEvents(data.data);
        setLastUpdated(new Date());
      } catch (err) {
        logger.error('Error fetching upcoming events', 'useUpcomingEvents', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sport, limit, enabled]
  );

  // Initial fetch
  useEffect(() => {
    fetchEvents(false);
  }, [fetchEvents]);

  // Set up refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchEvents(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchEvents, refreshInterval, enabled]);

  const refreshEvents = useCallback(async () => {
    await fetchEvents(true);
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    lastUpdated,
    refreshEvents,
    isRefreshing,
  };
}

// Hook for real-time events monitoring with more frequent updates
export function useRealtimeEvents(options: UseUpcomingEventsOptions = {}): UseUpcomingEventsReturn {
  const realtimeOptions = {
    ...options,
    refreshInterval: 5 * 60 * 1000, // 5 minutes for more real-time feel
  };

  return useUpcomingEvents(realtimeOptions);
}

// Hook for getting events by specific sport
export function useSportEvents(sport: string, limit: number = 10): UseUpcomingEventsReturn {
  return useUpcomingEvents({
    sport,
    limit,
    refreshInterval: 15 * 60 * 1000, // 15 minutes for sport-specific events
  });
}
