'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Swords, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/core/Button';
import { MatchThreadCard } from '@/components/match-threads/MatchThreadCard';
import { MatchThread } from '@/types/sports';
import { cn } from '@/lib/utils/client';

const SPORT_TABS = [
  { id: 'all', label: 'All Sports' },
  { id: 'Football', label: 'Football' },
  { id: 'American Football', label: 'NFL' },
  { id: 'Tennis', label: 'Tennis' },
  { id: 'Golf', label: 'Golf' },
];

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'finished', label: 'Recent' },
];

export default function MatchThreadsPage() {
  const [threads, setThreads] = useState<MatchThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/match-threads');
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to load match threads');

      setThreads(data.matchThreads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match threads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Apply filters
  const filtered = threads.filter((t) => {
    if (sportFilter !== 'all' && t.event.sport !== sportFilter) return false;
    if (statusFilter !== 'all' && t.event.status !== statusFilter) return false;
    return true;
  });

  const liveCount = threads.filter((t) => t.isLive).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      {/* Back to Sportsbites */}
      <Link
        href="/sportsbites"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Sportsbites
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Swords className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Match Threads</h1>
          <p className="text-sm text-muted-foreground">
            Live game discussions
            {liveCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                {liveCount} live
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Sport filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {SPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSportFilter(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
              sportFilter === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              statusFilter === tab.id
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="h-4 w-8 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
                <div className="h-6 w-3/4 rounded bg-muted" />
                <div className="flex gap-3">
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-12 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-950">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Failed to Load</h3>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button onClick={loadThreads} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Swords className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold">No match threads</h3>
          <p className="mx-auto max-w-sm text-muted-foreground">
            {sportFilter !== 'all' || statusFilter !== 'all'
              ? 'No threads match your filters. Try adjusting them.'
              : 'No live or upcoming matches right now. Check back later!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((thread) => (
            <MatchThreadCard key={thread.eventId} thread={thread} />
          ))}
        </div>
      )}

      {/* Auto-refresh indicator */}
      {!isLoading && !error && (
        <div className="flex justify-center">
          <Button onClick={loadThreads} variant="ghost" size="sm" className="text-muted-foreground">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
