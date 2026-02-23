'use client';

/**
 * Leaderboard Page
 *
 * Two views:
 *  - Content Rankings: Weekly content leaderboards with MEDALS rewards (default)
 *  - Token Stakers: MEDALS token holder leaderboard
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { LeaderboardGrid, WeeklyRewardsSummary, MedalsStakersLeaderboard } from '@/components/leaderboard';
import { Button } from '@/components/core/Button';
import { ChevronLeft, ChevronRight, RefreshCw, Trophy, Medal } from 'lucide-react';
import type { WeeklyLeaderboards } from '@/lib/metrics/types';
import { logger } from '@/lib/logger';

type LeaderboardView = 'content' | 'stakers';

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const _categoryFilter = searchParams.get('category'); // Reserved for future filtering

  // Tab state from URL
  const viewParam = searchParams.get('view');
  const activeView: LeaderboardView = viewParam === 'stakers' ? 'stakers' : 'content';

  const [leaderboards, setLeaderboards] = useState<WeeklyLeaderboards | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentWeekId, setCurrentWeekId] = useState<string>('');

  // Calculate week ID based on offset
  const getWeekId = (offset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - offset * 7);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Only fetch content leaderboards when on the content tab
    if (activeView !== 'content') return;

    const fetchLeaderboards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const weekId = getWeekId(weekOffset);
        setCurrentWeekId(weekId);

        const response = await fetch(`/api/metrics/leaderboard?weekId=${weekId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch leaderboards');
        }

        if (data.leaderboards) {
          setLeaderboards({
            weekId: data.weekId,
            generatedAt: new Date(data.generatedAt),
            leaderboards: data.leaderboards,
          });
        } else {
          setLeaderboards(null);
        }
      } catch (err) {
        logger.error('Error fetching leaderboards', 'LeaderboardPage', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboards();
  }, [weekOffset, activeView]);

  // Ensure weekId is set even on stakers tab (for header display consistency)
  useEffect(() => {
    if (!currentWeekId) {
      setCurrentWeekId(getWeekId(0));
    }
  }, [currentWeekId]);

  const handlePreviousWeek = () => setWeekOffset((prev) => prev + 1);
  const handleNextWeek = () => setWeekOffset((prev) => Math.max(0, prev - 1));
  const handleRefresh = () => setWeekOffset(weekOffset); // Trigger re-fetch

  const setView = (view: LeaderboardView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === 'content') {
      params.delete('view');
    } else {
      params.set('view', view);
    }
    router.push(`/leaderboard${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    });
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">MEDALS Leaderboards</h1>
            <p className="mt-1 text-muted-foreground">
              {activeView === 'content'
                ? 'Compete for weekly rewards by creating engaging content'
                : 'Top MEDALS token holders and stakers'}
            </p>
          </div>

          {/* Week Navigation — only on content tab */}
          {activeView === 'content' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[100px] rounded bg-muted px-3 py-1 text-center text-sm font-medium">
                {currentWeekId}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                disabled={weekOffset === 0}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Refresh">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setView('content')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeView === 'content'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Content Rankings
          </button>
          <button
            onClick={() => setView('stakers')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeView === 'stakers'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Medal className="h-4 w-4" />
            Token Stakers
          </button>
        </div>

        {/* Content Rankings Tab */}
        {activeView === 'content' && (
          <>
            {/* Weekly Rewards Summary */}
            <WeeklyRewardsSummary weekId={currentWeekId} />

            {/* Leaderboards Grid */}
            <LeaderboardGrid
              leaderboards={leaderboards}
              isLoading={isLoading}
              error={error}
              weekId={currentWeekId}
              showRewards={true}
            />

            {/* How to Compete Section */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-bold">How to Compete</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">📈 Most External Views</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your posts on social media and other platforms to drive traffic to
                    Sportsblock.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">👀 Most Viewed Post</h3>
                  <p className="text-sm text-muted-foreground">
                    Create content that keeps users engaged and coming back for more.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">💬 Top Commenter</h3>
                  <p className="text-sm text-muted-foreground">
                    Engage with the community by leaving thoughtful comments on posts.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">🔥 Most Engaged Post</h3>
                  <p className="text-sm text-muted-foreground">
                    Create content that sparks discussions and earns votes.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">⭐ Post of the Week</h3>
                  <p className="text-sm text-muted-foreground">
                    Selected by our curator team for exceptional quality content.
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">✨ Best Newcomer</h3>
                  <p className="text-sm text-muted-foreground">
                    New to Sportsblock? Make a great first impression! (Available Year 4+)
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Token Stakers Tab */}
        {activeView === 'stakers' && <MedalsStakersLeaderboard />}
      </div>
    </MainLayout>
  );
}
