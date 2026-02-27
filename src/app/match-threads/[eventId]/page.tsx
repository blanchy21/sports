'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/core/Button';
import { MatchThreadHeader } from '@/components/match-threads/MatchThreadHeader';
import { MatchThreadFeed } from '@/components/match-threads/MatchThreadFeed';
import { ComposeSportsbite } from '@/components/sportsbites/ComposeSportsbite';
import type { Sportsbite } from '@/lib/hive-workerbee/shared';
import { MatchThread } from '@/types/sports';

interface MatchThreadDetailPageProps {
  params: Promise<{ eventId: string }>;
}

export default function MatchThreadDetailPage({ params }: MatchThreadDetailPageProps) {
  const { eventId } = use(params);
  const [thread, setThread] = useState<MatchThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimisticBite, setOptimisticBite] = useState<Sportsbite | null>(null);

  const loadThread = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/match-threads/${eventId}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to load');

      if (!data.matchThread) {
        setError('Match thread not found');
      } else {
        setThread(data.matchThread as MatchThread);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match thread');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Link
          href="/match-threads"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Match Threads
        </Link>

        <div className="rounded-xl border bg-card p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/15 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">{error || 'Match thread not found'}</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            This thread may not exist yet or the event has expired.
          </p>
          <Button onClick={loadThread} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      {/* Back link */}
      <Link
        href="/match-threads"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Match Threads
      </Link>

      {/* Header */}
      <MatchThreadHeader event={thread.event} isLive={thread.isLive} isOpen={thread.isOpen} />

      {/* Compose area or read-only banner */}
      {thread.isOpen ? (
        <ComposeSportsbite
          matchThreadEventId={eventId}
          onSuccess={(bite) => setOptimisticBite(bite)}
          onError={(err) => console.error('Post error:', err)}
        />
      ) : (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          This thread is now read-only. Threads close 24 hours after the match ends.
        </div>
      )}

      {/* Feed */}
      <MatchThreadFeed eventId={eventId} isLive={thread.isLive} optimisticBite={optimisticBite} />
    </div>
  );
}
