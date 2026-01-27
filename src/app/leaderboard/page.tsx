'use client';

/**
 * Leaderboard Page
 *
 * Displays weekly content leaderboards and MEDALS rewards.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { LeaderboardGrid, WeeklyRewardsSummary } from '@/components/leaderboard';
import { Button } from '@/components/core/Button';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { WeeklyLeaderboards } from '@/lib/metrics/types';

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const _categoryFilter = searchParams.get('category'); // Reserved for future filtering

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
        console.error('Error fetching leaderboards:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboards();
  }, [weekOffset]);

  const handlePreviousWeek = () => setWeekOffset((prev) => prev + 1);
  const handleNextWeek = () => setWeekOffset((prev) => Math.max(0, prev - 1));
  const handleRefresh = () => setWeekOffset(weekOffset); // Trigger re-fetch

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">MEDALS Leaderboards</h1>
            <p className="mt-1 text-muted-foreground">
              Compete for weekly rewards by creating engaging content
            </p>
          </div>

          {/* Week Navigation */}
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
        </div>

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
      </div>
    </MainLayout>
  );
}
