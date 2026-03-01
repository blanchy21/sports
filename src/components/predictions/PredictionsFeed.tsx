'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PredictionBiteCard } from './PredictionBiteCard';
import type { PredictionBite } from '@/lib/predictions/types';
import { Loader2, RefreshCw, AlertCircle, Target } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { cn } from '@/lib/utils/client';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useCountdownTick } from '@/hooks/useCountdownTick';
import { usePredictions, predictionKeys } from '@/hooks/usePredictions';

type StatusFilter = 'all' | 'OPEN' | 'SETTLED';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Upcoming' },
  { value: 'OPEN', label: 'Open' },
  { value: 'SETTLED', label: 'Settled' },
];

interface PredictionsFeedProps {
  className?: string;
}

class PredictionCardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border bg-card p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/15 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Something went wrong</h3>
          <p className="mb-4 text-sm text-muted-foreground">A prediction card failed to render.</p>
          <Button onClick={() => this.setState({ hasError: false })} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PredictionsFeed({ className }: PredictionsFeedProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const queryClient = useQueryClient();

  const filters = useMemo(
    () => (statusFilter !== 'all' ? { status: statusFilter } : {}),
    [statusFilter]
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePredictions(filters);

  // Flatten all pages into a single predictions array
  const predictions = useMemo(() => data?.pages.flatMap((page) => page.predictions) ?? [], [data]);

  // Single shared timer for all countdown displays
  const hasOpenPredictions = useMemo(
    () => predictions.some((p) => p.status === 'OPEN'),
    [predictions]
  );
  const tick = useCountdownTick(hasOpenPredictions);

  const handleDeleted = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(id) });
    },
    [queryClient]
  );

  const handleUpdated = useCallback(
    (_updated: PredictionBite) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
    },
    [queryClient]
  );

  useInfiniteScroll({
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

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
          <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: predictionKeys.lists() })}
            variant="outline"
          >
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

      <PredictionCardErrorBoundary>
        {predictions.map((prediction) => (
          <PredictionBiteCard
            key={prediction.id}
            prediction={prediction}
            tick={tick}
            onDeleted={handleDeleted}
            onUpdated={handleUpdated}
          />
        ))}
      </PredictionCardErrorBoundary>

      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more...</span>
          </div>
        </div>
      )}

      {!hasNextPage && predictions.length > 0 && (
        <div className="flex justify-center py-6">
          <p className="text-sm text-muted-foreground">You&apos;ve reached the end</p>
        </div>
      )}
    </div>
  );
}
