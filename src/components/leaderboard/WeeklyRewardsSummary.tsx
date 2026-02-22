'use client';

/**
 * WeeklyRewardsSummary Component
 *
 * Shows a summary of weekly MEDALS rewards and their distribution.
 */

import React from 'react';
import { Trophy, Calendar, Coins, Users } from 'lucide-react';
import {
  CONTENT_REWARDS,
  getWeeklyStakingPool,
  getPlatformYear,
  CURATOR_REWARDS,
} from '@/lib/rewards/config';

interface WeeklyRewardsSummaryProps {
  weekId?: string;
  compact?: boolean;
}

export function WeeklyRewardsSummary({ weekId, compact = false }: WeeklyRewardsSummaryProps) {
  const platformYear = getPlatformYear();
  const stakingPool = getWeeklyStakingPool();

  // Calculate content rewards total
  const contentRewardsTotal = Object.values(CONTENT_REWARDS).reduce((sum, reward) => {
    if ('minPlatformYear' in reward && reward.minPlatformYear > platformYear) {
      return sum;
    }
    if ('reward' in reward) return sum + reward.reward;
    if ('maxReward' in reward) return sum + reward.maxReward;
    return sum;
  }, 0);

  // Calculate curator rewards potential (max daily * 7 days)
  const curatorPotential =
    CURATOR_REWARDS.CURATOR_COUNT *
    CURATOR_REWARDS.MAX_VOTES_PER_DAY *
    7 *
    (platformYear >= 4 ? CURATOR_REWARDS.AMOUNT_Y4_PLUS : CURATOR_REWARDS.AMOUNT_Y1_3);

  const totalWeekly = stakingPool + contentRewardsTotal + curatorPotential;

  if (compact) {
    return (
      <div className="from-primary/10 to-accent/10 rounded-lg border bg-linear-to-r p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">Weekly Rewards Pool</span>
          </div>
          <div className="text-primary text-lg font-bold">
            {totalWeekly.toLocaleString()} MEDALS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Weekly Rewards
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Year {platformYear} of the MEDALS economy
          </p>
        </div>
        {weekId && (
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4" />
            {weekId}
          </div>
        )}
      </div>

      {/* Reward Categories */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Staking Rewards */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
          <div className="mb-2 flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Staking Rewards</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stakingPool.toLocaleString()}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">Distributed to all stakers</p>
        </div>

        {/* Content Rewards */}
        <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/30">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Content Rewards</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {contentRewardsTotal.toLocaleString()}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">Leaderboard winners</p>
        </div>

        {/* Curator Rewards */}
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            <span className="font-medium">Curator Rewards</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            up to {curatorPotential.toLocaleString()}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {CURATOR_REWARDS.CURATOR_COUNT} curators × {CURATOR_REWARDS.MAX_VOTES_PER_DAY} votes/day
          </p>
        </div>
      </div>

      {/* Content Rewards Breakdown */}
      <div className="border-t pt-4">
        <h3 className="mb-3 font-medium">Content Rewards Breakdown</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {Object.entries(CONTENT_REWARDS).map(([key, config]) => {
            // Skip if not available this year
            if ('minPlatformYear' in config && config.minPlatformYear > platformYear) {
              return null;
            }

            const amount = 'reward' in config ? config.reward : config.maxReward;
            return (
              <div
                key={key}
                className="bg-muted/50 flex items-center justify-between rounded px-3 py-2 text-sm"
              >
                <span className="mr-2 truncate">{config.name}</span>
                <span className="font-medium whitespace-nowrap">{amount.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="text-lg font-medium">Total Weekly Distribution</span>
        <span className="text-primary text-2xl font-bold">
          ~{totalWeekly.toLocaleString()} MEDALS
        </span>
      </div>
    </div>
  );
}

export default WeeklyRewardsSummary;
