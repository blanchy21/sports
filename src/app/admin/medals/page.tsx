'use client';

/**
 * MEDALS Admin Dashboard
 *
 * Admin tools for managing rewards and monitoring the token economy.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Trophy,
  Coins,
  Users,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Settings,
  TrendingUp,
} from 'lucide-react';
import {
  getPlatformYear,
  getWeeklyStakingPool,
  getCuratorRewardAmount,
  CURATOR_REWARDS,
} from '@/lib/rewards/config';

interface DashboardMetrics {
  stakingRewards: {
    lastDistribution: string | null;
    weeklyPool: number;
    totalStakers: number;
    totalStaked: number;
  };
  curatorRewards: {
    todayVotes: number;
    todayRewards: number;
    activeCurators: number;
  };
  contentRewards: {
    lastWeek: string | null;
    pendingDistributions: number;
    totalDistributed: number;
  };
}

// Admin accounts that can access this dashboard
const ADMIN_ACCOUNTS = ['sportsblock', 'admin']; // Configure as needed

export default function MedalsAdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user && ADMIN_ACCOUNTS.includes(user.username);
  const platformYear = getPlatformYear();
  const weeklyStakingPool = getWeeklyStakingPool();
  const curatorRewardAmount = getCuratorRewardAmount();

  useEffect(() => {
    // Redirect non-admins
    if (!isLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    const fetchMetrics = async () => {
      // For now, set mock metrics - replace with real API calls
      setMetrics({
        stakingRewards: {
          lastDistribution: null,
          weeklyPool: weeklyStakingPool,
          totalStakers: 0,
          totalStaked: 0,
        },
        curatorRewards: {
          todayVotes: 0,
          todayRewards: 0,
          activeCurators: CURATOR_REWARDS.CURATOR_COUNT,
        },
        contentRewards: {
          lastWeek: null,
          pendingDistributions: 0,
          totalDistributed: 0,
        },
      });
      setIsLoading(false);
    };

    if (user) {
      fetchMetrics();
    }
  }, [user, weeklyStakingPool]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleTriggerCron = async (cronType: string) => {
    try {
      const response = await fetch(`/api/cron/${cronType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      alert(`${cronType} result: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      alert(`Error triggering ${cronType}: ${err}`);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access the admin dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              MEDALS Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Platform Year {platformYear} • Manage rewards and monitor token economy
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Platform Year</span>
            </div>
            <p className="text-3xl font-bold">{platformYear}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Coins className="h-4 w-4" />
              <span className="text-sm">Weekly Staking Pool</span>
            </div>
            <p className="text-3xl font-bold">{weeklyStakingPool.toLocaleString()}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">Curator Reward</span>
            </div>
            <p className="text-3xl font-bold">{curatorRewardAmount}</p>
            <p className="text-xs text-muted-foreground">per vote</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Active Curators</span>
            </div>
            <p className="text-3xl font-bold">{CURATOR_REWARDS.CURATOR_COUNT}</p>
          </div>
        </div>

        {/* Cron Jobs Management */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Jobs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Staking Rewards */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Staking Rewards</h3>
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  Sundays 00:00 UTC
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Distributes {weeklyStakingPool.toLocaleString()} MEDALS weekly to stakers
              </p>
              <div className="flex items-center gap-2 text-sm mb-3">
                {metrics?.stakingRewards.lastDistribution ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Last run: {metrics.stakingRewards.lastDistribution}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>No distribution yet</span>
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTriggerCron('staking-rewards')}
              >
                Trigger Manually
              </Button>
            </div>

            {/* Curator Rewards */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Curator Rewards</h3>
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  Every 15 min
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Processes curator votes and queues rewards
              </p>
              <div className="flex items-center gap-2 text-sm mb-3">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span>Today: {metrics?.curatorRewards.todayVotes || 0} votes processed</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTriggerCron('curator-rewards')}
              >
                Trigger Manually
              </Button>
            </div>

            {/* Weekly Content Rewards */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Content Rewards</h3>
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  Mondays 00:00 UTC
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Generates leaderboards and calculates content rewards
              </p>
              <div className="flex items-center gap-2 text-sm mb-3">
                {metrics?.contentRewards.pendingDistributions ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>{metrics.contentRewards.pendingDistributions} pending</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>All distributed</span>
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTriggerCron('weekly-rewards')}
              >
                Trigger Manually
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push('/leaderboard')}>
              <Trophy className="h-4 w-4 mr-2" />
              View Leaderboards
            </Button>
            <Button variant="outline" onClick={() => router.push('/wallet')}>
              <Coins className="h-4 w-4 mr-2" />
              Wallet
            </Button>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <h3 className="font-medium mb-2">Environment</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-muted-foreground">Mode:</span>{' '}
              <span className="font-mono">{process.env.NODE_ENV}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cron Secret:</span>{' '}
              <span className="font-mono">
                {process.env.CRON_SECRET ? '✓ Set' : '✗ Not set'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Curator Accounts:</span>{' '}
              <span className="font-mono">
                {process.env.CURATOR_ACCOUNTS || 'Default'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Logged in as:</span>{' '}
              <span className="font-mono">@{user?.username}</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
