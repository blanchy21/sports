'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PredictionBiteCard } from './PredictionBiteCard';
import type { PredictionBite } from '@/lib/predictions/types';
import { Loader2, RefreshCw, AlertCircle, Target } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { cn } from '@/lib/utils/client';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { logger } from '@/lib/logger';

type StatusFilter = 'all' | 'OPEN' | 'SETTLED';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'SETTLED', label: 'Settled' },
];

interface PredictionsFeedProps {
  className?: string;
}

export function PredictionsFeed({ className }: PredictionsFeedProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [predictions, setPredictions] = useState<PredictionBite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const nextCursorRef = useRef<string | null>(null);

  const loadPredictions = useCallback(
    async (loadMore = false) => {
      if (loadMore && !nextCursorRef.current) return;

      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({ limit: '20' });
        if (loadMore && nextCursorRef.current) {
          params.append('cursor', nextCursorRef.current);
        }
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const response = await fetch(`/api/predictions?${params.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch predictions: ${response.status}`);

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch predictions');

        const fetched: PredictionBite[] = result.data?.predictions || [];

        setPredictions((prev) => {
          if (!loadMore) return fetched;
          const existingIds = new Set(prev.map((p) => p.id));
          const unique = fetched.filter((p) => !existingIds.has(p.id));
          return [...prev, ...unique];
        });

        nextCursorRef.current = result.data?.nextCursor ?? null;
        setHasMore(!!result.data?.nextCursor);
      } catch (err) {
        logger.error('Error loading predictions', 'PredictionsFeed', err);
        setError(err instanceof Error ? err.message : 'Failed to load predictions');
        if (!loadMore) setPredictions([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [statusFilter]
  );

  const handleDeleted = useCallback((id: string) => {
    setPredictions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleUpdated = useCallback((updated: PredictionBite) => {
    setPredictions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: () => loadPredictions(true),
  });

  // Reset and reload when status filter changes
  useEffect(() => {
    nextCursorRef.current = null;
    loadPredictions();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterTabs = (
    <div className="flex gap-2">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setStatusFilter(tab.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            statusFilter === tab.value
              ? 'bg-amber-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {filterTabs}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        {filterTabs}
        <div className="rounded-xl border bg-card p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/15 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Failed to Load Predictions</h3>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => loadPredictions()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {filterTabs}
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-amber-500/10 p-4">
              <Target className="h-12 w-12 text-amber-500" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold">No predictions yet</h3>
          <p className="mx-auto max-w-sm text-muted-foreground">
            Be the first to create a prediction! Stake MEDALS on sports outcomes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {filterTabs}

      {predictions.map((prediction) => (
        <PredictionBiteCard
          key={prediction.id}
          prediction={prediction}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      ))}

      {isLoadingMore && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more...</span>
          </div>
        </div>
      )}

      {!hasMore && predictions.length > 0 && (
        <div className="flex justify-center py-6">
          <p className="text-sm text-muted-foreground">You&apos;ve reached the end</p>
        </div>
      )}
    </div>
  );
}
