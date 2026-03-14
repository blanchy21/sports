'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/client';
import { MatchEventsTimeline } from '@/components/match-threads/MatchEventsTimeline';
import { MatchStatsPanel } from '@/components/match-threads/MatchStatsPanel';
import { MatchLineups } from '@/components/match-threads/MatchLineups';
import type { MatchDetail } from '@/types/sports';

interface MatchDetailTabsProps {
  eventId: string;
  isSoccer: boolean;
  isLive: boolean;
}

type Tab = 'events' | 'stats' | 'lineups';

const TABS: { key: Tab; label: string }[] = [
  { key: 'events', label: 'Events' },
  { key: 'stats', label: 'Stats' },
  { key: 'lineups', label: 'Lineups' },
];

const POLL_INTERVAL = 30_000;

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function MatchDetailTabs({ eventId, isSoccer, isLive }: MatchDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip fetching for non-soccer events
    if (!isSoccer) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDetail = async () => {
      try {
        const response = await fetch(`/api/match-threads/${eventId}/details`);
        if (cancelled) return;
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

        const result = await response.json();
        if (cancelled) return;
        if (!result.success) throw new Error(result.error || 'Failed to fetch match details');

        setDetail(result.detail);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load match details');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchDetail();

    if (isLive) {
      intervalRef.current = setInterval(fetchDetail, POLL_INTERVAL);
    }

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [eventId, isLive, isSoccer]);

  // Do not render anything for non-soccer events
  if (!isSoccer) return null;

  // Determine team names from lineup data
  const homeTeam = detail?.homeLineup?.teamName ?? undefined;
  const awayTeam = detail?.awayLineup?.teamName ?? undefined;

  return (
    <div className="rounded-xl border bg-card">
      {/* Tab bar */}
      <div className="flex gap-1 border-b p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{error}</div>
        ) : detail ? (
          <>
            {activeTab === 'events' && (
              <MatchEventsTimeline events={detail.events} homeTeam={homeTeam} awayTeam={awayTeam} />
            )}
            {activeTab === 'stats' && (
              <MatchStatsPanel stats={detail.stats} homeTeam={homeTeam} awayTeam={awayTeam} />
            )}
            {activeTab === 'lineups' && (
              <MatchLineups homeLineup={detail.homeLineup} awayLineup={detail.awayLineup} />
            )}
          </>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No match details available
          </div>
        )}
      </div>
    </div>
  );
}
