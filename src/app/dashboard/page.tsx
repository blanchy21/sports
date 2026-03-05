'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Heart,
  DollarSign,
  Award,
  FileText,
  RefreshCw,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { PotentialEarningsWidget } from '@/components/widgets/PotentialEarningsWidget';
import {
  MyRankCard,
  LeaderboardGrid,
  WeeklyWinners,
  WeeklyRewardsSummary,
} from '@/components/leaderboard';
import { useWeeklyLeaderboards } from '@/lib/react-query/queries/useLeaderboard';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, authType, refreshHiveAccount, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Calculate current ISO week ID for leaderboard queries
  const currentWeekId = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }, []);

  const { data: leaderboards, isLoading: leaderboardsLoading, error: leaderboardsError } =
    useWeeklyLeaderboards(currentWeekId, 5);

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const handleRefreshData = async () => {
    if (authType !== 'hive') return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      await refreshHiveAccount();
    } catch {
      setRefreshError('Failed to refresh data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show skeleton while auth is loading (handled by loading.tsx for initial load)
  if (isAuthLoading) {
    return null; // Let loading.tsx handle it
  }

  // User not authenticated - redirect
  if (!user) {
    return (
      <MainLayout showRightSidebar={false} className="max-w-none">
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h2 className="mb-2 text-xl font-semibold">Please sign in to view your dashboard</h2>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={false} className="max-w-none">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Avatar
              src={user.avatar}
              fallback={user.username}
              alt={user.displayName || user.username}
              size="lg"
            />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{user.displayName || user.username}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
              {authType === 'hive' && (
                <div className="mt-1 flex items-center space-x-1">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Hive Authenticated</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {authType === 'hive' && (
              <Button
                variant="outline"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            )}
            <Button onClick={() => router.push('/publish')}>Create Post</Button>
          </div>
        </div>

        {/* Error Message */}
        {refreshError && (
          <div className="flex items-center space-x-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive">{refreshError}</span>
          </div>
        )}

        {/* Upgrade Prompt for Soft Users */}
        {authType === 'soft' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PotentialEarningsWidget />
            <div className="rounded-lg bg-gradient-to-r from-primary to-accent p-6 text-white">
              <div className="mb-3 flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Unlock Rewards</h3>
              </div>
              <p className="mb-4 text-sm text-white/90">
                Connect a Hive wallet to start earning cryptocurrency for your content. Your posts,
                votes, and engagement can all generate real rewards!
              </p>
              <ul className="mb-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <DollarSign className="h-4 w-4" />
                  Earn HIVE & HBD for posts
                </li>
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <Heart className="h-4 w-4" />
                  Get curation rewards for voting
                </li>
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <FileText className="h-4 w-4" />
                  Unlimited posts on blockchain
                </li>
              </ul>
              <Link href="/auth">
                <Button
                  variant="secondary"
                  className="bg-white font-semibold text-primary hover:bg-white/90"
                >
                  Connect Hive Wallet
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Your Rankings */}
        <MyRankCard username={user?.username} />

        {/* Weekly Rewards Summary */}
        <WeeklyRewardsSummary weekId={currentWeekId} compact />

        {/* This Week's Winners */}
        <WeeklyWinners weekId={currentWeekId} />

        {/* Full Leaderboard Grid */}
        <LeaderboardGrid
          leaderboards={leaderboards ?? null}
          isLoading={leaderboardsLoading}
          error={leaderboardsError instanceof Error ? leaderboardsError.message : leaderboardsError ? 'Unknown error' : null}
          weekId={currentWeekId}
          showRewards
          maxEntries={5}
        />
      </div>
    </MainLayout>
  );
}
