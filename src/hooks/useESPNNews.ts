import { useState, useEffect, useCallback } from 'react';
import { ESPNNewsArticle, ESPNNewsApiResponse } from '@/types';
import { logger } from '@/lib/logger';

interface UseESPNNewsOptions {
  sport?: string;
  limit?: number;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseESPNNewsReturn {
  articles: ESPNNewsArticle[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshNews: () => Promise<void>;
  isRefreshing: boolean;
}

export function useESPNNews(options: UseESPNNewsOptions = {}): UseESPNNewsReturn {
  const {
    sport,
    limit = 15,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
    enabled = true,
  } = options;

  const [articles, setArticles] = useState<ESPNNewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(
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

        const response = await fetch(`/api/sports/news?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ESPNNewsApiResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch news');
        }

        setArticles(data.data);
        setLastUpdated(new Date());
      } catch (err) {
        logger.error('Error fetching ESPN news', 'useESPNNews', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch news');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sport, limit, enabled]
  );

  // Initial fetch
  useEffect(() => {
    fetchNews(false);
  }, [fetchNews]);

  // Set up refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchNews(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchNews, refreshInterval, enabled]);

  const refreshNews = useCallback(async () => {
    await fetchNews(true);
  }, [fetchNews]);

  return {
    articles,
    isLoading,
    error,
    lastUpdated,
    refreshNews,
    isRefreshing,
  };
}

// Hook for top headlines with frequent updates
export function useTopHeadlines(limit: number = 10): UseESPNNewsReturn {
  return useESPNNews({
    limit,
    refreshInterval: 3 * 60 * 1000, // 3 minutes for headlines
  });
}

// Hook for sport-specific news
export function useSportNews(sport: string, limit: number = 10): UseESPNNewsReturn {
  return useESPNNews({
    sport,
    limit,
    refreshInterval: 5 * 60 * 1000, // 5 minutes for sport-specific
  });
}
