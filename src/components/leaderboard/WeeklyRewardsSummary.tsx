'use client';

/**
 * WeeklyRewardsSummary Component
 *
 * Shows a summary of weekly MEDALS rewards and their distribution.
 */

import React from 'react';
import { Trophy, Calendar, Coins, Users } from 'lucide-react';
import { CONTENT_REWARDS, getWeeklyStakingPool, getPlatformYear, CURATOR_REWARDS } from '@/lib/rewards/config';

interface WeeklyRewardsSummaryProps {
  weekId?: string;
  compact?: boolean;
}

export function WeeklyRewardsSummary({
  weekId,
  compact = false,
}: WeeklyRewardsSummaryProps) {
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
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">Weekly Rewards Pool</span>
          </div>
          <div className="text-lg font-bold text-primary">
            {totalWeekly.toLocaleString()} MEDALS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Weekly Rewards
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Year {platformYear} of the MEDALS economy
          </p>
        </div>
        {weekId && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {weekId}
          </div>
        )}
      </div>

      {/* Reward Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Staking Rewards */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Staking Rewards</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stakingPool.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Distributed to all stakers
          </p>
        </div>

        {/* Content Rewards */}
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Content Rewards</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {contentRewardsTotal.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Leaderboard winners
          </p>
        </div>

        {/* Curator Rewards */}
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-green-500" />
            <span className="font-medium">Curator Rewards</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            up to {curatorPotential.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {CURATOR_REWARDS.CURATOR_COUNT} curators × {CURATOR_REWARDS.MAX_VOTES_PER_DAY} votes/day
          </p>
        </div>
      </div>

      {/* Content Rewards Breakdown */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Content Rewards Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(CONTENT_REWARDS).map(([key, config]) => {
            // Skip if not available this year
            if ('minPlatformYear' in config && config.minPlatformYear > platformYear) {
              return null;
            }

            const amount = 'reward' in config ? config.reward : config.maxReward;
            return (
              <div
                key={key}
                className="flex justify-between items-center bg-muted/50 rounded px-3 py-2 text-sm"
              >
                <span className="truncate mr-2">{config.name}</span>
                <span className="font-medium whitespace-nowrap">
                  {amount.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div className="border-t mt-4 pt-4 flex justify-between items-center">
        <span className="text-lg font-medium">Total Weekly Distribution</span>
        <span className="text-2xl font-bold text-primary">
          ~{totalWeekly.toLocaleString()} MEDALS
        </span>
      </div>
    </div>
  );
}

export default WeeklyRewardsSummary;
