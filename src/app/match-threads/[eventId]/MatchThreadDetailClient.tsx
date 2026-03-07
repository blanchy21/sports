'use client';

import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { MatchThreadHeader } from '@/components/match-threads/MatchThreadHeader';
import { MatchThreadFeed } from '@/components/match-threads/MatchThreadFeed';
import { ComposeSportsbite } from '@/components/sportsbites/ComposeSportsbite';
import type { Sportsbite } from '@/lib/hive-workerbee/shared';
import { MatchThread } from '@/types/sports';

interface MatchThreadDetailClientProps {
  thread: MatchThread;
}

export default function MatchThreadDetailClient({ thread }: MatchThreadDetailClientProps) {
  const [optimisticBite, setOptimisticBite] = useState<Sportsbite | null>(null);

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
          matchThreadEventId={thread.eventId}
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
      <MatchThreadFeed
        eventId={thread.eventId}
        isLive={thread.isLive}
        optimisticBite={optimisticBite}
      />
    </div>
  );
}
