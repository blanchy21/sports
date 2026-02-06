'use client';

/**
 * MEDALS Admin Dashboard
 *
 * Admin tools for managing rewards and monitoring the token economy.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/core/Button';
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
  UserPlus,
  Trash2,
} from 'lucide-react';
import { isAdminAccount } from '@/lib/admin/config';

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

interface EnvironmentInfo {
  nodeEnv: string;
  cronSecretSet: boolean;
  curatorAccounts: string[];
  firebaseConfigured: boolean;
}

interface AdminConfig {
  platformYear: number;
  weeklyPool: number;
  curatorRewardAmount: number;
  curatorCount: number;
}

export default function MedalsAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cronStatus, setCronStatus] = useState<string | null>(null);
  const [curators, setCurators] = useState<string[]>([]);
  const [newCurator, setNewCurator] = useState('');
  const [curatorLoading, setCuratorLoading] = useState(false);

  const username = user?.username;
  const isAdmin = !!username && isAdminAccount(username);
  const isLoading = authLoading || metricsLoading;

  const fetchMetrics = useCallback(async () => {
    if (!username) return;
    setError(null);

    try {
      const response = await fetch('/api/admin/metrics');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch metrics');
        return;
      }

      setMetrics(data.metrics);
      setEnvironmentInfo(data.environmentInfo);
      setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!authLoading && !user) {
      setMetricsLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    if (username) {
      fetchMetrics();
    }
  }, [username, fetchMetrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMetrics();
    setIsRefreshing(false);
  };

  const handleTriggerCron = async (cronType: string) => {
    if (!username) return;
    setCronStatus(null);

    try {
      const response = await fetch('/api/admin/trigger-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronType }),
      });
      const data = await response.json();

      if (data.success) {
        setCronStatus(`${cronType}: completed successfully`);
        await fetchMetrics();
      } else {
        setCronStatus(`${cronType} error: ${data.error || data.result?.error || 'Unknown error'}`);
      }
    } catch (err) {
      setCronStatus(`${cronType} error: ${err instanceof Error ? err.message : 'Request failed'}`);
    }
  };

  const fetchCurators = useCallback(async () => {
    if (!username) return;
    try {
      const response = await fetch('/api/admin/curators');
      const data = await response.json();
      if (data.success) {
        setCurators(data.curators);
      }
    } catch {
      // Curators will show from metrics fallback
    }
  }, [username]);

  useEffect(() => {
    if (username && isAdmin) {
      fetchCurators();
    }
  }, [username, isAdmin, fetchCurators]);

  const handleAddCurator = async () => {
    if (!username || !newCurator.trim()) return;
    setCuratorLoading(true);
    try {
      const response = await fetch('/api/admin/curators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curator: newCurator.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (data.success) {
        setCurators(data.curators);
        setNewCurator('');
      } else {
        setCronStatus(`Curator error: ${data.error}`);
      }
    } catch (err) {
      setCronStatus(`Curator error: ${err instanceof Error ? err.message : 'Request failed'}`);
    } finally {
      setCuratorLoading(false);
    }
  };

  const handleRemoveCurator = async (curator: string) => {
    if (!username) return;
    setCuratorLoading(true);
    try {
      const response = await fetch('/api/admin/curators', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curator }),
      });
      const data = await response.json();
      if (data.success) {
        setCurators(data.curators);
      } else {
        setCronStatus(`Curator error: ${data.error}`);
      }
    } catch (err) {
      setCronStatus(`Curator error: ${err instanceof Error ? err.message : 'Request failed'}`);
    } finally {
      setCuratorLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access the admin dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  const platformYear = config?.platformYear ?? 1;
  const weeklyStakingPool = config?.weeklyPool ?? 0;
  const curatorRewardAmount = config?.curatorRewardAmount ?? 0;
  const curatorCount = config?.curatorCount ?? 0;

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Settings className="h-8 w-8" />
              MEDALS Admin Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Platform Year {platformYear} • Manage rewards and monitor token economy
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Error fetching metrics</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Cron Status */}
        {cronStatus && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              cronStatus.includes('error')
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
                : 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
            }`}
          >
            {cronStatus}
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Platform Year</span>
            </div>
            <p className="text-3xl font-bold">{platformYear}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span className="text-sm">Weekly Staking Pool</span>
            </div>
            <p className="text-3xl font-bold">{weeklyStakingPool.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Curator Reward</span>
            </div>
            <p className="text-3xl font-bold">{curatorRewardAmount}</p>
            <p className="text-xs text-muted-foreground">per vote</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Active Curators</span>
            </div>
            <p className="text-3xl font-bold">{curatorCount}</p>
          </div>
        </div>

        {/* Cron Jobs Management */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Clock className="h-5 w-5" />
            Scheduled Jobs
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Staking Rewards */}
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Staking Rewards</h3>
                <span className="rounded bg-muted px-2 py-1 text-xs">Sundays 00:00 UTC</span>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Distributes {weeklyStakingPool.toLocaleString()} MEDALS weekly to stakers
              </p>
              <div className="mb-3 flex items-center gap-2 text-sm">
                {metrics?.stakingRewards.lastDistribution ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                      Last run:{' '}
                      {new Date(metrics.stakingRewards.lastDistribution).toLocaleDateString()}
                    </span>
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
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Curator Rewards</h3>
                <span className="rounded bg-muted px-2 py-1 text-xs">Every 15 min</span>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Processes curator votes and queues rewards
              </p>
              <div className="mb-3 flex items-center gap-2 text-sm">
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
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Content Rewards</h3>
                <span className="rounded bg-muted px-2 py-1 text-xs">Mondays 00:00 UTC</span>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Generates leaderboards and calculates content rewards
              </p>
              <div className="mb-3 flex items-center gap-2 text-sm">
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

        {/* Curator Management */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Users className="h-5 w-5" />
            Curator Management
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Curators earn post authors {curatorRewardAmount} MEDALS per qualifying upvote (max {5}{' '}
            votes/day each).
          </p>

          {/* Current Curators */}
          <div className="mb-4 space-y-2">
            {curators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No curators configured.</p>
            ) : (
              curators.map((curator) => (
                <div
                  key={curator}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="font-mono text-sm">@{curator}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCurator(curator)}
                    disabled={curatorLoading}
                    className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add Curator */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCurator}
              onChange={(e) => setNewCurator(e.target.value)}
              placeholder="Hive username"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCurator();
              }}
            />
            <Button
              size="sm"
              onClick={handleAddCurator}
              disabled={curatorLoading || !newCurator.trim()}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-bold">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push('/leaderboard')}>
              <Trophy className="mr-2 h-4 w-4" />
              View Leaderboards
            </Button>
            <Button variant="outline" onClick={() => router.push('/wallet')}>
              <Coins className="mr-2 h-4 w-4" />
              Wallet
            </Button>
          </div>
        </div>

        {/* Environment Info */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <h3 className="mb-2 font-medium">Environment</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Mode:</span>{' '}
              <span className="font-mono">{environmentInfo?.nodeEnv ?? '...'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cron Secret:</span>{' '}
              <span className="font-mono">
                {environmentInfo ? (environmentInfo.cronSecretSet ? '✓ Set' : '✗ Not set') : '...'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Curator Accounts:</span>{' '}
              <span className="font-mono">
                {environmentInfo?.curatorAccounts?.join(', ') || '...'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Logged in as:</span>{' '}
              <span className="font-mono">@{username}</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
