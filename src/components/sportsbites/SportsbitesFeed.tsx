'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SportsbiteCard } from './SportsbiteCard';
import { Sportsbite, SportsbiteApiResponse } from '@/lib/hive-workerbee/sportsbites';
import { Loader2, RefreshCw, AlertCircle, Zap, ArrowUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { cn } from '@/lib/utils/client';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const REALTIME_POLL_INTERVAL = 15000;

interface SportsbitesFeedProps {
  author?: string;
  followingList?: string[];
  filterMode?: 'latest' | 'trending' | 'following';
  className?: string;
  refreshTrigger?: number;
}

export function SportsbitesFeed({
  author,
  followingList = [],
  filterMode = 'latest',
  className,
  refreshTrigger = 0,
}: SportsbitesFeedProps) {
  const [bites, setBites] = useState<Sportsbite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [newBitesCount, setNewBitesCount] = useState(0);
  const [pendingBites, setPendingBites] = useState<Sportsbite[]>([]);
  const [newBiteIds, setNewBiteIds] = useState<Set<string>>(new Set());

  const nextCursorRef = useRef<string | undefined>(undefined);
  const latestBiteRef = useRef<string | undefined>(undefined);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const newAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dedupeBites = useCallback((list: Sportsbite[]) => {
    const seen = new Set<string>();
    return list.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, []);

  const filterByMode = useCallback(
    (list: Sportsbite[]) => {
      if (filterMode === 'following' && followingList.length > 0) {
        return list.filter((s) => followingList.includes(s.author));
      }
      return list;
    },
    [filterMode, followingList]
  );

  const loadBites = useCallback(
    async (loadMore = false) => {
      const cursor = loadMore ? nextCursorRef.current : undefined;
      if (loadMore && !cursor) return;

      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({ limit: '20' });
        if (author) params.append('author', author);
        if (loadMore && cursor) params.append('before', cursor);

        const response = await fetch(`/api/hive/sportsbites?${params.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch sportsbites: ${response.status}`);

        const result: SportsbiteApiResponse = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch sportsbites');

        const filtered = filterByMode(result.sportsbites);

        setBites((prev) => {
          const merged = loadMore ? [...prev, ...filtered] : filtered;
          return dedupeBites(merged);
        });

        if (!loadMore && result.sportsbites.length > 0) {
          latestBiteRef.current = result.sportsbites[0].id;
        }

        nextCursorRef.current = result.nextCursor;
        setHasMore(result.hasMore);
      } catch (err) {
        console.error('Error loading sportsbites:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sportsbites');
        if (!loadMore) setBites([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [author, dedupeBites, filterByMode]
  );

  const checkForNew = useCallback(async () => {
    if (!latestBiteRef.current || isLoading) return;

    try {
      const params = new URLSearchParams({ limit: '10' });
      if (author) params.append('author', author);

      const response = await fetch(`/api/hive/sportsbites?${params.toString()}`);
      if (!response.ok) return;

      const result: SportsbiteApiResponse = await response.json();
      if (!result.success || result.sportsbites.length === 0) return;

      const currentIds = new Set(bites.map((s) => s.id));
      const newOnes = filterByMode(result.sportsbites).filter((s) => !currentIds.has(s.id));

      if (newOnes.length > 0) {
        setPendingBites((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const uniqueNew = newOnes.filter((s) => !existingIds.has(s.id));
          return [...uniqueNew, ...prev];
        });
        setNewBitesCount((prev) => prev + newOnes.length);
      }
    } catch (err) {
      console.error('Error checking for new sportsbites:', err);
    }
  }, [author, bites, isLoading, filterByMode]);

  const showNewBites = useCallback(() => {
    if (pendingBites.length === 0) return;

    const newIds = new Set(pendingBites.map((s) => s.id));
    setNewBiteIds(newIds);

    setBites((prev) => dedupeBites([...pendingBites, ...prev]));
    setPendingBites([]);
    setNewBitesCount(0);

    if (pendingBites.length > 0) {
      latestBiteRef.current = pendingBites[0].id;
    }

    if (newAnimationTimeoutRef.current) clearTimeout(newAnimationTimeoutRef.current);
    newAnimationTimeoutRef.current = setTimeout(() => {
      setNewBiteIds(new Set());
      newAnimationTimeoutRef.current = null;
    }, 5000);
  }, [pendingBites, dedupeBites]);

  useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: () => loadBites(true),
  });

  useEffect(() => {
    loadBites();
  }, [author, filterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (refreshTrigger > 0) {
      setPendingBites([]);
      setNewBitesCount(0);
      loadBites();
    }
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading || bites.length === 0) return;
    realtimeIntervalRef.current = setInterval(checkForNew, REALTIME_POLL_INTERVAL);
    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
    };
  }, [isLoading, bites.length, checkForNew]);

  useEffect(() => {
    return () => {
      if (newAnimationTimeoutRef.current) {
        clearTimeout(newAnimationTimeoutRef.current);
        newAnimationTimeoutRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
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
      <div className={cn('rounded-xl border bg-card p-8 text-center', className)}>
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-950">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold">Failed to Load Sportsbites</h3>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => loadBites()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (bites.length === 0) {
    return (
      <div className={cn('rounded-xl border bg-card p-12 text-center', className)}>
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Zap className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-semibold">
          {author ? `No sportsbites from @${author}` : 'No sportsbites yet'}
        </h3>
        <p className="mx-auto max-w-sm text-muted-foreground">
          {author
            ? "This user hasn't posted any sportsbites yet."
            : 'Be the first to share a quick sports take! Sportsbites are perfect for live match reactions and quick thoughts.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {newBitesCount > 0 && (
        <button
          onClick={showNewBites}
          className={cn(
            'flex w-full items-center justify-center gap-2 px-4 py-3',
            'bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20',
            'rounded-xl border border-primary/30',
            'text-sm font-medium text-primary',
            'hover:from-primary/30 hover:via-primary/20 hover:to-primary/30',
            'cursor-pointer transition-all duration-300',
            'animate-pulse hover:animate-none',
            'shadow-lg shadow-primary/10'
          )}
        >
          <ArrowUp className="h-4 w-4" />
          <Sparkles className="h-4 w-4" />
          <span>
            {newBitesCount === 1 ? '1 new sportsbite' : `${newBitesCount} new sportsbites`}
          </span>
          <span className="text-primary/70">— tap to see</span>
        </button>
      )}

      {bites.map((bite) => (
        <SportsbiteCard key={bite.id} sportsbite={bite} isNew={newBiteIds.has(bite.id)} />
      ))}

      {isLoadingMore && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more sportsbites...</span>
          </div>
        </div>
      )}

      {!hasMore && bites.length > 0 && (
        <div className="flex justify-center py-6">
          <p className="text-sm text-muted-foreground">You&apos;ve reached the end of the feed</p>
        </div>
      )}

      {filterMode === 'following' && bites.length === 0 && !isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No sportsbites from people you follow</h3>
          <p className="text-sm text-muted-foreground">
            {followingList.length === 0
              ? 'Follow some users to see their sportsbites here!'
              : "The people you follow haven't posted any sportsbites yet."}
          </p>
        </div>
      )}
    </div>
  );
}
