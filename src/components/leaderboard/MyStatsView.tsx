'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import {
  PenLine,
  Zap,
  MessageSquare,
  Eye,
  Flame,
  Medal,
  Target,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { useUserStats } from '@/lib/react-query/queries/useUserStats';
import { useUserBadges } from '@/lib/react-query/queries/useUserBadges';
import { RankBadge } from '@/components/badges/RankBadge';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { BadgeProgress } from '@/components/badges/BadgeProgress';
import { getRankTierForScore, RANK_TIERS } from '@/lib/badges/catalogue';

interface MyStatsViewProps {
  username: string;
  className?: string;
}

export function MyStatsView({ username, className }: MyStatsViewProps) {
  const { data: statsData, isLoading: statsLoading } = useUserStats(username);
  const { isLoading: badgesLoading } = useUserBadges(username);

  if (statsLoading || badgesLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading stats...</span>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className={cn('rounded-lg border bg-sb-stadium p-6 text-center', className)}>
        <p className="text-muted-foreground">
          No stats available yet. Start posting to build your profile!
        </p>
      </div>
    );
  }

  const { stats, predictions, sportRanks } = statsData;
  const score = stats.medalsScore;
  const currentTier = getRankTierForScore(score);
  const nextTier = RANK_TIERS.find((t) => t.min > currentTier.max);
  const progressToNext = nextTier
    ? Math.min(((score - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)
    : 100;

  return (
    <div className={cn('space-y-6', className)}>
      {/* MEDALS Rank Card */}
      <div className="rounded-lg border bg-sb-stadium p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-1 text-lg font-bold">MEDALS Rank</h3>
            <RankBadge rank={stats.medalsRank} size="md" />
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{Math.round(score)}</span>
            <p className="text-xs text-muted-foreground">Composite Score</p>
          </div>
        </div>
        {nextTier && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentTier.label}</span>
              <span>{nextTier.label}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sb-turf">
              <div
                className={cn('h-full rounded-full transition-all', currentTier.bgGradient)}
                style={{ width: `${Math.round(progressToNext)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(nextTier.min - score)} points to {nextTier.label}
            </p>
          </div>
        )}
      </div>

      {/* Activity Summary */}
      <div className="rounded-lg border bg-sb-stadium p-6">
        <h3 className="mb-4 text-lg font-bold">Activity Summary</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={PenLine} label="Posts" value={stats.totalPosts} />
          <StatCard icon={Zap} label="Sportsbites" value={stats.totalSportsbites} />
          <StatCard icon={MessageSquare} label="Comments" value={stats.totalComments} />
          <StatCard icon={Eye} label="Views Received" value={stats.totalViewsReceived} />
          <StatCard
            icon={Flame}
            label="Posting Streak"
            value={stats.currentPostingStreak}
            suffix="wk"
          />
          <StatCard
            icon={Medal}
            label="MEDALS Earned"
            value={Math.round(stats.totalMedalsEarned)}
          />
        </div>
      </div>

      {/* Prediction Stats */}
      {predictions.total > 0 && (
        <div className="rounded-lg border bg-sb-stadium p-6">
          <h3 className="mb-4 text-lg font-bold">Predictions</h3>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={Target}
              label="Accuracy"
              value={Math.round(predictions.winRate * 100)}
              suffix="%"
            />
            <StatCard icon={Target} label="Total" value={predictions.total} />
            <StatCard icon={TrendingUp} label="Wins" value={predictions.wins} />
          </div>
        </div>
      )}

      {/* Sport Ranks */}
      {sportRanks.length > 0 && (
        <div className="rounded-lg border bg-sb-stadium p-6">
          <h3 className="mb-4 text-lg font-bold">Sport Ranks</h3>
          <div className="flex flex-wrap gap-2">
            {sportRanks.map((sr) => (
              <div key={sr.sportId} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <span className="text-sm font-medium capitalize">
                  {sr.sportId.replace(/-/g, ' ')}
                </span>
                <RankBadge rank={sr.rank} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badge Collection + Progress */}
      <div className="rounded-lg border bg-sb-stadium p-6">
        <h3 className="mb-4 text-lg font-bold">Badge Collection</h3>
        <BadgeGrid username={username} />
        <div className="mt-6">
          <BadgeProgress username={username} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-sb-turf/50 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
      <div className="text-lg font-bold">
        {value.toLocaleString()}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
