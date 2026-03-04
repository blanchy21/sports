'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SportsbiteCard } from './SportsbiteCard';
import type {
  Sportsbite,
  ReactionEmoji,
  ReactionCounts,
  PollResults,
} from '@/lib/hive-workerbee/shared';
import { Loader2, RefreshCw, AlertCircle, Zap, ArrowUp } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { FeedItemErrorBoundary } from '@/components/core/FeedItemErrorBoundary';
import { cn } from '@/lib/utils/client';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { interleaveAds } from '@/lib/utils/interleave-ads';
import { prefetchUserProfiles } from '@/lib/react-query/queries/useUserProfile';
import { useSportsbitesFeed, flattenSportsbitePages } from '@/lib/react-query/queries/useSportsbites';

function SportsbitesFeedSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-0', className)}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse border-b border-border px-4 py-3">
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

interface SportsbitesFeedProps {
  author?: string;
  followingList?: string[];
  filterMode?: 'latest' | 'trending' | 'following';
  tagFilter?: string;
  className?: string;
  optimisticBite?: Sportsbite | null;
}

export function SportsbitesFeed({
  author,
  followingList = [],
  filterMode = 'latest',
  tagFilter,
  className,
  optimisticBite = null,
}: SportsbitesFeedProps) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useSportsbitesFeed({ author });

  // --- Client-side filtering (following + tag) ---
  const followingListRef = useRef(followingList);
  followingListRef.current = followingList;

  const allBites = useMemo(() => {
    let bites = flattenSportsbitePages(data?.pages);

    if (filterMode === 'following' && followingListRef.current.length > 0) {
      bites = bites.filter((s) => followingListRef.current.includes(s.author));
    }
    if (tagFilter) {
      const tagPattern = new RegExp(
        `#${tagFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i'
      );
      bites = bites.filter((s) => tagPattern.test(s.body));
    }
    return bites;
  }, [data?.pages, filterMode, tagFilter]);

  // --- New bites banner (detect new items from background refetches) ---
  const [pendingBites, setPendingBites] = useState<Sportsbite[]>([]);
  const [newBiteIds, setNewBiteIds] = useState<Set<string>>(new Set());
  const [displayedIds, setDisplayedIds] = useState<Set<string>>(new Set());
  const newAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track displayed bite IDs so we can detect new ones from refetches
  useEffect(() => {
    if (allBites.length > 0 && displayedIds.size === 0) {
      // First load — seed displayed IDs
      setDisplayedIds(new Set(allBites.map((b) => b.id)));
    }
  }, [allBites, displayedIds.size]);

  // Detect new bites from background refetches (page 1 re-fetched via refetchInterval)
  useEffect(() => {
    if (displayedIds.size === 0 || allBites.length === 0) return;

    const newOnes = allBites.filter((b) => !displayedIds.has(b.id));
    if (newOnes.length > 0) {
      setPendingBites((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const uniqueNew = newOnes.filter((s) => !existingIds.has(s.id));
        if (uniqueNew.length === 0) return prev;
        return [...uniqueNew, ...prev];
      });
    }
  }, [allBites, displayedIds]);

  const showNewBites = useCallback(() => {
    if (pendingBites.length === 0) return;

    const newIds = new Set(pendingBites.map((s) => s.id));
    setNewBiteIds(newIds);
    // Merge pending IDs into displayed set
    setDisplayedIds((prev) => {
      const next = new Set(prev);
      for (const id of newIds) next.add(id);
      return next;
    });
    setPendingBites([]);

    if (newAnimationTimeoutRef.current) clearTimeout(newAnimationTimeoutRef.current);
    newAnimationTimeoutRef.current = setTimeout(() => {
      setNewBiteIds(new Set());
      newAnimationTimeoutRef.current = null;
    }, 5000);
  }, [pendingBites]);

  // --- Optimistic bite handling ---
  useEffect(() => {
    if (!optimisticBite) return;

    const newId = optimisticBite.id;
    setNewBiteIds(new Set([newId]));
    setDisplayedIds((prev) => new Set([newId, ...prev]));
    setPendingBites([]);

    if (newAnimationTimeoutRef.current) clearTimeout(newAnimationTimeoutRef.current);
    newAnimationTimeoutRef.current = setTimeout(() => {
      setNewBiteIds(new Set());
      newAnimationTimeoutRef.current = null;
    }, 5000);
  }, [optimisticBite]);

  // --- Deletion handler (remove from displayed set so it doesn't reappear as "new") ---
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const handleDelete = useCallback((id: string) => {
    setDeletedIds((prev) => new Set([...prev, id]));
  }, []);

  // --- Batch-fetched reaction and poll data ---
  const [reactionData, setReactionData] = useState<
    Record<string, { counts: ReactionCounts; userReaction: ReactionEmoji | null }>
  >({});
  const [pollData, setPollData] = useState<
    Record<string, { results: PollResults; userVote: 0 | 1 | null }>
  >({});

  // Build the final display list (optimistic + server bites, minus deleted)
  const displayBites = useMemo(() => {
    const bites = optimisticBite ? [optimisticBite, ...allBites] : allBites;
    // Dedupe (optimistic bite may appear in server data after refetch)
    const seen = new Set<string>();
    return bites.filter((b) => {
      if (seen.has(b.id) || deletedIds.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [allBites, optimisticBite, deletedIds]);

  // Batch-fetch reaction data when bites change
  useEffect(() => {
    if (displayBites.length === 0) return;

    const idsToFetch = displayBites.map((b) => b.id).filter((id) => !reactionData[id]);
    if (idsToFetch.length === 0) return;

    const controller = new AbortController();
    fetch('/api/soft/reactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sportsbiteIds: idsToFetch.slice(0, 50) }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.results) {
          setReactionData((prev) => ({ ...prev, ...data.results }));
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.warn('Failed to fetch sportsbites reactions:', err);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayBites]);

  // Batch-fetch poll data when bites with polls change
  useEffect(() => {
    const pollBiteIds = displayBites
      .filter((b) => b.poll)
      .map((b) => b.id)
      .filter((id) => !pollData[id]);
    if (pollBiteIds.length === 0) return;

    const controller = new AbortController();
    fetch('/api/soft/poll-votes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sportsbiteIds: pollBiteIds.slice(0, 50) }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.results) {
          setPollData((prev) => ({ ...prev, ...data.results }));
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.warn('Failed to fetch sportsbites poll data:', err);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayBites]);

  // Batch-prefetch author profiles
  useEffect(() => {
    if (displayBites.length === 0) return;
    const authors = displayBites.map((b) => b.author);
    prefetchUserProfiles(authors, queryClient);
  }, [displayBites, queryClient]);

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (newAnimationTimeoutRef.current) {
        clearTimeout(newAnimationTimeoutRef.current);
        newAnimationTimeoutRef.current = null;
      }
    };
  }, []);

  // --- Infinite scroll ---
  useInfiniteScroll({
    hasMore: hasNextPage ?? false,
    isLoading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

  // --- Render ---
  if (isLoading) {
    return <SportsbitesFeedSkeleton className={className} />;
  }

  if (error) {
    return (
      <div className={cn('rounded-xl border bg-card p-8 text-center', className)}>
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-destructive/15 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold">Failed to Load Sportsbites</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load sportsbites'}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (displayBites.length === 0) {
    if (filterMode === 'following') {
      return (
        <div className={cn('rounded-xl border bg-card p-8 text-center', className)}>
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
      );
    }
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
    <div className={cn('space-y-0', className)}>
      {pendingBites.length > 0 && (
        <button
          onClick={showNewBites}
          className={cn(
            'flex w-full items-center justify-center gap-2 border-b border-primary/30 bg-primary/5 px-4 py-3',
            'text-sm font-medium text-primary',
            'cursor-pointer transition-colors hover:bg-primary/10'
          )}
        >
          <ArrowUp className="h-4 w-4" />
          <span>
            Show{' '}
            {pendingBites.length === 1
              ? '1 new sportsbite'
              : `${pendingBites.length} new sportsbites`}
          </span>
        </button>
      )}

      {interleaveAds(
        displayBites.map((bite) => (
          <FeedItemErrorBoundary key={bite.id}>
            <SportsbiteCard
              sportsbite={bite}
              isNew={newBiteIds.has(bite.id)}
              onDelete={handleDelete}
              initialReactionCounts={reactionData[bite.id]?.counts}
              initialUserReaction={reactionData[bite.id]?.userReaction}
              initialPollResults={pollData[bite.id]?.results}
              initialPollUserVote={pollData[bite.id]?.userVote}
            />
          </FeedItemErrorBoundary>
        ))
      )}

      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more...</span>
          </div>
        </div>
      )}

      {!hasNextPage && displayBites.length > 0 && (
        <div className="flex justify-center py-6">
          <p className="text-sm text-muted-foreground">You&apos;ve reached the end of the feed</p>
        </div>
      )}
    </div>
  );
}
