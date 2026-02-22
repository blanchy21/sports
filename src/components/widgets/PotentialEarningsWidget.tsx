'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/client';
import { TrendingUp, DollarSign, Zap, ArrowRight, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { usePriceContext } from '@/contexts/PriceContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface PotentialEarningsWidgetProps {
  className?: string;
}

interface UserStats {
  postCount: number;
  totalLikes: number;
  isLoading: boolean;
  error: string | null;
}

// Rough estimates based on typical Hive post rewards
// These are conservative estimates for demonstration
const HIVE_REWARD_PER_POST_BASE = 0.5; // $0.50 base reward per post
const HIVE_REWARD_PER_LIKE = 0.05; // $0.05 curation reward per like (very conservative)
const WEEKLY_POST_MULTIPLIER = 0.3; // Assume 30% of posts are "this week" for weekly estimate

export const PotentialEarningsWidget: React.FC<PotentialEarningsWidgetProps> = ({ className }) => {
  const { user, authType } = useAuth();
  const { hivePrice, isLoading: isPriceLoading } = usePriceContext();
  const [stats, setStats] = useState<UserStats>({
    postCount: 0,
    totalLikes: 0,
    isLoading: true,
    error: null,
  });
  const [showTooltip, setShowTooltip] = useState(false);

  // Only show for soft users
  const isSoftUser = authType === 'soft';

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id || !isSoftUser) {
        setStats({ postCount: 0, totalLikes: 0, isLoading: false, error: null });
        return;
      }

      try {
        const response = await fetch(`/api/posts?authorId=${encodeURIComponent(user.id)}`);
        const data = await response.json();

        if (data.success && data.posts) {
          const posts = data.posts;
          const totalLikes = posts.reduce(
            (sum: number, post: { likeCount?: number }) => sum + (post.likeCount || 0),
            0
          );

          setStats({
            postCount: posts.length,
            totalLikes,
            isLoading: false,
            error: null,
          });
        } else {
          setStats((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setStats((prev) => ({ ...prev, isLoading: false, error: 'Failed to load stats' }));
      }
    };

    fetchStats();
  }, [user?.id, isSoftUser]);

  // Don't show for Hive users or non-authenticated users
  if (!isSoftUser || !user) {
    return null;
  }

  // Calculate potential earnings
  const calculateEarnings = () => {
    const { postCount, totalLikes } = stats;

    // Total potential earnings
    const postRewards = postCount * HIVE_REWARD_PER_POST_BASE;
    const likeRewards = totalLikes * HIVE_REWARD_PER_LIKE;
    const totalUsd = postRewards + likeRewards;

    // Weekly estimate (rough calculation)
    const weeklyUsd = totalUsd * WEEKLY_POST_MULTIPLIER;

    // Convert to HIVE if price available
    const totalHive = hivePrice ? totalUsd / hivePrice : null;
    const weeklyHive = hivePrice ? weeklyUsd / hivePrice : null;

    return {
      totalUsd: totalUsd.toFixed(2),
      weeklyUsd: weeklyUsd.toFixed(2),
      totalHive: totalHive?.toFixed(2) || null,
      weeklyHive: weeklyHive?.toFixed(2) || null,
    };
  };

  const earnings = calculateEarnings();
  const hasActivity = stats.postCount > 0 || stats.totalLikes > 0;

  if (stats.isLoading || isPriceLoading) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-linear-to-br from-green-500/5 to-emerald-500/5 p-4',
          className
        )}
      >
        <div className="flex animate-pulse items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-green-500" />
          <span className="text-muted-foreground text-sm">Calculating potential earnings...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-linear-to-br from-green-500/5 to-emerald-500/5 p-4',
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-green-500/10 p-1.5">
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-foreground font-semibold">Potential Earnings</h3>
        </div>
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="hover:bg-muted rounded-full p-1 transition-colors"
          >
            <Info className="text-muted-foreground h-4 w-4" />
          </button>
          {showTooltip && (
            <div className="bg-popover text-muted-foreground absolute top-full right-0 z-10 mt-1 w-64 rounded-lg border p-3 text-xs shadow-lg">
              <p>
                This is an estimate based on average Hive rewards. Actual earnings depend on content
                quality, timing, and community engagement.
              </p>
            </div>
          )}
        </div>
      </div>

      {hasActivity ? (
        <>
          {/* Earnings Display */}
          <div className="mb-4 space-y-3">
            {/* Total Potential */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total potential:</span>
              <div className="text-right">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  ${earnings.totalUsd}
                </span>
                {earnings.totalHive && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({earnings.totalHive} HIVE)
                  </span>
                )}
              </div>
            </div>

            {/* Weekly Estimate */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Est. weekly:</span>
              <div className="text-right">
                <span className="text-foreground font-medium">${earnings.weeklyUsd}</span>
                {earnings.weeklyHive && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({earnings.weeklyHive} HIVE)
                  </span>
                )}
              </div>
            </div>

            {/* Stats breakdown */}
            <div className="border-border border-t pt-2">
              <div className="text-muted-foreground flex items-center gap-4 text-xs">
                <span>{stats.postCount} posts</span>
                <span>{stats.totalLikes} likes received</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Link href="/settings?tab=wallet">
            <Button className="w-full gap-2" size="sm">
              <TrendingUp className="h-4 w-4" />
              Start Earning on Hive
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </>
      ) : (
        /* No activity state */
        <div className="py-2 text-center">
          <p className="text-muted-foreground mb-3 text-sm">
            Start posting to see your potential earnings!
          </p>
          <div className="text-muted-foreground mb-3 flex items-center justify-center gap-2 text-xs">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>Hive users can earn rewards on every post</span>
          </div>
          <Link href="/publish">
            <Button variant="outline" size="sm" className="gap-2">
              Create Your First Post
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* HIVE Price footer */}
      {hivePrice && (
        <div className="border-border mt-3 border-t pt-2">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>HIVE Price</span>
            <span>${hivePrice.toFixed(4)} USD</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact inline version for headers
export const PotentialEarningsBadge: React.FC<{
  totalUsd?: string;
  className?: string;
}> = ({ totalUsd = '0.00', className }) => {
  const { authType } = useAuth();

  if (authType !== 'soft') return null;

  return (
    <Link
      href="/settings?tab=wallet"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'text-xs font-medium transition-opacity hover:opacity-80',
        className
      )}
    >
      <DollarSign className="h-3 w-3" />
      <span>${totalUsd} potential</span>
    </Link>
  );
};
