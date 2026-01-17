"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { ShortCard } from "./ShortCard";
import { Short, ShortsApiResponse } from "@/lib/hive-workerbee/shorts";
import { Loader2, RefreshCw, AlertCircle, Zap, ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

// Real-time polling interval (15 seconds)
const REALTIME_POLL_INTERVAL = 15000;

interface ShortsFeedProps {
  author?: string;
  followingList?: string[]; // List of usernames the current user follows
  filterMode?: 'latest' | 'trending' | 'following';
  className?: string;
  refreshTrigger?: number; // Increment to trigger refresh
}

export function ShortsFeed({ 
  author, 
  followingList = [],
  filterMode = 'latest',
  className, 
  refreshTrigger = 0 
}: ShortsFeedProps) {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
  // Real-time state
  const [newShortsCount, setNewShortsCount] = useState(0);
  const [pendingShorts, setPendingShorts] = useState<Short[]>([]);
  const [newShortIds, setNewShortIds] = useState<Set<string>>(new Set());
  
  const nextCursorRef = useRef<string | undefined>(undefined);
  const latestShortRef = useRef<string | undefined>(undefined);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dedupe shorts by ID
  const dedupeShorts = useCallback((shortsList: Short[]) => {
    const seen = new Set<string>();
    return shortsList.filter((short) => {
      if (seen.has(short.id)) {
        return false;
      }
      seen.add(short.id);
      return true;
    });
  }, []);

  // Filter shorts based on mode
  const filterShortsByMode = useCallback((shortsList: Short[]) => {
    if (filterMode === 'following' && followingList.length > 0) {
      return shortsList.filter(s => followingList.includes(s.author));
    }
    // For 'trending', we could sort by votes, but for now just return as-is
    // The API should handle trending sorting
    return shortsList;
  }, [filterMode, followingList]);

  // Fetch shorts
  const loadShorts = useCallback(async (loadMore = false) => {
    const cursor = loadMore ? nextCursorRef.current : undefined;
    
    if (loadMore && !cursor) {
      return;
    }

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        limit: '20',
      });
      
      if (author) params.append('author', author);
      if (loadMore && cursor) params.append('before', cursor);

      const response = await fetch(`/api/hive/shorts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shorts: ${response.status}`);
      }

      const result: ShortsApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch shorts');
      }

      // Apply filter
      const filteredShorts = filterShortsByMode(result.shorts);

      setShorts((prev) => {
        const merged = loadMore ? [...prev, ...filteredShorts] : filteredShorts;
        return dedupeShorts(merged);
      });

      // Track latest short for real-time updates
      if (!loadMore && result.shorts.length > 0) {
        latestShortRef.current = result.shorts[0].id;
      }

      nextCursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading shorts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shorts');
      
      if (!loadMore) {
        setShorts([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [author, dedupeShorts, filterShortsByMode]);

  // Check for new shorts (real-time polling)
  const checkForNewShorts = useCallback(async () => {
    if (!latestShortRef.current || isLoading) return;

    try {
      const params = new URLSearchParams({ limit: '10' });
      if (author) params.append('author', author);

      const response = await fetch(`/api/hive/shorts?${params.toString()}`);
      if (!response.ok) return;

      const result: ShortsApiResponse = await response.json();
      if (!result.success || result.shorts.length === 0) return;

      // Find new shorts that we haven't seen yet
      const currentIds = new Set(shorts.map(s => s.id));
      const newShorts = filterShortsByMode(result.shorts).filter(s => !currentIds.has(s.id));

      if (newShorts.length > 0) {
        setPendingShorts(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const uniqueNew = newShorts.filter(s => !existingIds.has(s.id));
          return [...uniqueNew, ...prev];
        });
        setNewShortsCount(prev => prev + newShorts.length);
      }
    } catch (err) {
      console.error('Error checking for new shorts:', err);
    }
  }, [author, shorts, isLoading, filterShortsByMode]);

  // Show pending shorts when user clicks "Show new shorts"
  const showNewShorts = useCallback(() => {
    if (pendingShorts.length === 0) return;

    // Mark these as new for animation
    const newIds = new Set(pendingShorts.map(s => s.id));
    setNewShortIds(newIds);

    // Add pending shorts to the top
    setShorts(prev => dedupeShorts([...pendingShorts, ...prev]));
    setPendingShorts([]);
    setNewShortsCount(0);

    // Update latest ref
    if (pendingShorts.length > 0) {
      latestShortRef.current = pendingShorts[0].id;
    }

    // Clear "new" animation after 5 seconds
    setTimeout(() => {
      setNewShortIds(new Set());
    }, 5000);
  }, [pendingShorts, dedupeShorts]);

  // Set up infinite scroll
  useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: () => loadShorts(true),
  });

  // Initial load
  useEffect(() => {
    loadShorts();
  }, [author, filterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      // Clear pending shorts first
      setPendingShorts([]);
      setNewShortsCount(0);
      loadShorts();
    }
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time polling for new shorts
  useEffect(() => {
    // Only poll if not loading and we have shorts
    if (isLoading || shorts.length === 0) return;

    realtimeIntervalRef.current = setInterval(checkForNewShorts, REALTIME_POLL_INTERVAL);

    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
    };
  }, [isLoading, shorts.length, checkForNewShorts]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("bg-card border rounded-xl p-8 text-center", className)}>
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-950 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to Load Shorts</h3>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button onClick={() => loadShorts()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (shorts.length === 0) {
    return (
      <div className={cn("bg-card border rounded-xl p-12 text-center", className)}>
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Zap className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {author ? `No shorts from @${author}` : "No shorts yet"}
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {author 
            ? "This user hasn't posted any shorts yet."
            : "Be the first to share a quick sports take! Shorts are perfect for live match reactions and quick thoughts."
          }
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* New shorts banner */}
      {newShortsCount > 0 && (
        <button
          onClick={showNewShorts}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 px-4",
            "bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20",
            "border border-primary/30 rounded-xl",
            "text-primary font-medium text-sm",
            "hover:from-primary/30 hover:via-primary/20 hover:to-primary/30",
            "transition-all duration-300 cursor-pointer",
            "animate-pulse hover:animate-none",
            "shadow-lg shadow-primary/10"
          )}
        >
          <ArrowUp className="h-4 w-4" />
          <Sparkles className="h-4 w-4" />
          <span>
            {newShortsCount === 1 
              ? "1 new short" 
              : `${newShortsCount} new shorts`}
          </span>
          <span className="text-primary/70">— tap to see</span>
        </button>
      )}

      {/* Shorts list */}
      {shorts.map((short) => (
        <ShortCard 
          key={short.id} 
          short={short} 
          isNew={newShortIds.has(short.id)}
        />
      ))}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more shorts...</span>
          </div>
        </div>
      )}

      {/* End of feed */}
      {!hasMore && shorts.length > 0 && (
        <div className="flex justify-center py-6">
          <p className="text-sm text-muted-foreground">
            You&apos;ve reached the end of the feed
          </p>
        </div>
      )}

      {/* Following mode empty state */}
      {filterMode === 'following' && shorts.length === 0 && !isLoading && (
        <div className="bg-card border rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">No shorts from people you follow</h3>
          <p className="text-muted-foreground text-sm">
            {followingList.length === 0 
              ? "Follow some users to see their shorts here!"
              : "The people you follow haven't posted any shorts yet."}
          </p>
        </div>
      )}
    </div>
  );
}
