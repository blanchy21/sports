'use client';

/**
 * Leaderboard Page
 *
 * Three main tabs:
 *  - Content Rankings: Weekly / Monthly / All-Time leaderboards
 *  - Token Stakers: MEDALS token holder leaderboard
 *  - My Stats: Personal stats dashboard (authenticated only)
 */

import React, { Suspense, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  LeaderboardGrid,
  MyRankCard,
  WeeklyRewardsSummary,
  MedalsStakersLeaderboard,
  WeeklyWinners,
  RisingStars,
  MyStatsView,
  MonthlyLeaderboardView,
  AllTimeLeaderboardView,
} from '@/components/leaderboard';
import { Button } from '@/components/core/Button';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trophy,
  Medal,
  BarChart3,
  Calendar,
  Clock,
  Infinity,
} from 'lucide-react';
import { useWeeklyLeaderboards } from '@/lib/react-query/queries/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryClient';
import { getWeekId } from '@/lib/rewards/staking-distribution';

type LeaderboardView = 'content' | 'stakers' | 'mystats';
type ContentPeriod = 'weekly' | 'monthly' | 'alltime';

function getWeekIdFromOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offset * 7);
  return getWeekId(date);
}

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Tab state from URL
  const viewParam = searchParams.get('view');
  const activeView: LeaderboardView =
    viewParam === 'stakers' ? 'stakers' : viewParam === 'mystats' ? 'mystats' : 'content';

  // Period state from URL
  const periodParam = searchParams.get('period');
  const activePeriod: ContentPeriod =
    periodParam === 'monthly' ? 'monthly' : periodParam === 'alltime' ? 'alltime' : 'weekly';

  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekId = useMemo(() => getWeekIdFromOffset(weekOffset), [weekOffset]);

  const { data: leaderboards, isLoading, error } = useWeeklyLeaderboards(currentWeekId, 50);

  const handlePreviousWeek = () => setWeekOffset((prev) => prev + 1);
  const handleNextWeek = () => setWeekOffset((prev) => Math.max(0, prev - 1));
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboards.week(currentWeekId) });
  };

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

  const setPeriod = (period: ContentPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === 'weekly') {
      params.delete('period');
    } else {
      params.set('period', period);
    }
    params.delete('view'); // content tab
    router.push(`/leaderboard${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    });
  };

  const PERIOD_OPTIONS: { value: ContentPeriod; label: string; icon: React.ElementType }[] = [
    { value: 'weekly', label: 'Weekly', icon: Calendar },
    { value: 'monthly', label: 'Monthly', icon: Clock },
    { value: 'alltime', label: 'All-Time', icon: Infinity },
  ];

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">MEDALS Leaderboards</h1>
            <p className="mt-1 text-muted-foreground">
              {activeView === 'content'
                ? activePeriod === 'weekly'
                  ? 'Compete for weekly rewards by creating engaging content'
                  : activePeriod === 'monthly'
                    ? 'Monthly content rankings with sport-specific titles'
                    : 'Lifetime achievement rankings'
                : activeView === 'stakers'
                  ? 'Top MEDALS token holders and stakers'
                  : 'Your personal stats and achievements'}
            </p>
          </div>

          {/* Week Navigation — only on content tab / weekly period */}
          {activeView === 'content' && activePeriod === 'weekly' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[100px] rounded bg-sb-turf px-3 py-1 text-center text-sm font-medium">
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
        <div className="flex gap-1 rounded-lg bg-sb-turf p-1">
          <button
            onClick={() => setView('content')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeView === 'content'
                ? 'bg-background text-sb-text-primary shadow-sm'
                : 'text-muted-foreground hover:text-sb-text-primary'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Content Rankings
          </button>
          <button
            onClick={() => setView('stakers')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeView === 'stakers'
                ? 'bg-background text-sb-text-primary shadow-sm'
                : 'text-muted-foreground hover:text-sb-text-primary'
            }`}
          >
            <Medal className="h-4 w-4" />
            Token Stakers
          </button>
          {user && (
            <button
              onClick={() => setView('mystats')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeView === 'mystats'
                  ? 'bg-background text-sb-text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-sb-text-primary'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              My Stats
            </button>
          )}
        </div>

        {/* Content Rankings Tab */}
        {activeView === 'content' && (
          <>
            {/* Period Selector */}
            <div className="flex gap-1 rounded-lg border p-1">
              {PERIOD_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activePeriod === value
                      ? 'bg-primary text-[#051A14]'
                      : 'text-muted-foreground hover:text-sb-text-primary'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Weekly Content */}
            {activePeriod === 'weekly' && (
              <>
                {user && <MyRankCard username={user.username} />}
                <WeeklyWinners weekId={currentWeekId} />
                <WeeklyRewardsSummary weekId={currentWeekId} />
                <RisingStars currentWeekId={currentWeekId} />
                <LeaderboardGrid
                  leaderboards={leaderboards ?? null}
                  isLoading={isLoading}
                  error={error ? (error instanceof Error ? error.message : 'Unknown error') : null}
                  weekId={currentWeekId}
                  showRewards={true}
                  maxEntries={50}
                />
                <div className="rounded-lg border bg-sb-stadium p-6">
                  <h2 className="mb-4 text-xl font-bold">How to Compete</h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 font-semibold">Most External Views</h3>
                      <p className="text-sm text-muted-foreground">
                        Share your posts on social media and other platforms to drive traffic to
                        Sportsblock.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold">Most Viewed Post</h3>
                      <p className="text-sm text-muted-foreground">
                        Create content that keeps users engaged and coming back for more.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold">Top Commenter</h3>
                      <p className="text-sm text-muted-foreground">
                        Engage with the community by leaving thoughtful comments on posts.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold">Most Engaged Post</h3>
                      <p className="text-sm text-muted-foreground">
                        Create content that sparks discussions and earns votes.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold">Post of the Week</h3>
                      <p className="text-sm text-muted-foreground">
                        Selected by our curator team for exceptional quality content.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold">Best Newcomer</h3>
                      <p className="text-sm text-muted-foreground">
                        New to Sportsblock? Make a great first impression! (Available Year 4+)
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Monthly Content */}
            {activePeriod === 'monthly' && <MonthlyLeaderboardView />}

            {/* All-Time Content */}
            {activePeriod === 'alltime' && <AllTimeLeaderboardView />}
          </>
        )}

        {/* Token Stakers Tab */}
        {activeView === 'stakers' && <MedalsStakersLeaderboard />}

        {/* My Stats Tab */}
        {activeView === 'mystats' && user && <MyStatsView username={user.username} />}
      </div>
    </MainLayout>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
