'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/client';
import { X, Zap, TrendingUp, Award, Wallet, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/core/Button';
import Link from 'next/link';

export type UpgradeIncentiveType =
  | 'post-published'
  | 'popular-post'
  | 'storage-warning'
  | 'storage-critical'
  | 'milestone'
  | 'general';

interface UpgradeIncentiveProps {
  type: UpgradeIncentiveType;
  className?: string;
  onDismiss?: () => void;
  dismissible?: boolean;
  // Post-specific data
  likeCount?: number;
  potentialEarnings?: string;
  // Storage-specific data
  postsRemaining?: number;
  totalPosts?: number;
  // Milestone-specific data
  milestoneName?: string;
}

const incentiveConfigs: Record<
  UpgradeIncentiveType,
  {
    icon: React.ReactNode;
    title: string;
    getMessage: (props: UpgradeIncentiveProps) => string;
    ctaText: string;
    bgClass: string;
    iconBgClass: string;
  }
> = {
  'post-published': {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Great post!',
    getMessage: () =>
      'Upgrade to Hive to earn crypto rewards for your content. Your posts could earn real money!',
    ctaText: 'Start Earning',
    bgClass: 'bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20',
    iconBgClass: 'bg-primary/20 text-primary',
  },
  'popular-post': {
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Your content is popular!',
    getMessage: (props) => {
      const earnings = props.potentialEarnings || '$2-5';
      return `With ${props.likeCount || 10}+ likes, this post could have earned you ${earnings} on Hive. Connect a wallet to start earning!`;
    },
    ctaText: 'See Potential Earnings',
    bgClass: 'bg-gradient-to-r from-success/10 to-emerald-500/10 border-success/20',
    iconBgClass: 'bg-success/20 text-success',
  },
  'storage-warning': {
    icon: <Wallet className="h-5 w-5" />,
    title: 'Running low on storage',
    getMessage: (props) =>
      `You have ${props.postsRemaining || 10} posts remaining out of ${props.totalPosts || 50}. Upgrade to Hive for unlimited posts!`,
    ctaText: 'Upgrade Now',
    bgClass: 'bg-gradient-to-r from-warning/10 to-orange-500/10 border-warning/20',
    iconBgClass: 'bg-warning/20 text-warning',
  },
  'storage-critical': {
    icon: <Wallet className="h-5 w-5" />,
    title: 'Almost out of storage!',
    getMessage: (props) =>
      `Only ${props.postsRemaining || 5} posts left! Connect a Hive wallet now to get unlimited storage and earn rewards.`,
    ctaText: 'Connect Hive Wallet',
    bgClass: 'bg-gradient-to-r from-destructive/10 to-rose-500/10 border-destructive/20',
    iconBgClass: 'bg-destructive/20 text-destructive',
  },
  milestone: {
    icon: <Award className="h-5 w-5" />,
    title: 'Congratulations!',
    getMessage: (props) =>
      `You've reached ${props.milestoneName || 'a milestone'}! Hive users earn MEDALS badges for achievements like this.`,
    ctaText: 'Learn About MEDALS',
    bgClass: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20',
    iconBgClass: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  },
  general: {
    icon: <Zap className="h-5 w-5" />,
    title: 'Unlock more features',
    getMessage: () =>
      'Connect a Hive wallet to earn rewards, vote on content, and unlock unlimited storage.',
    ctaText: 'Connect Wallet',
    bgClass: 'bg-gradient-to-r from-info/10 to-indigo-500/10 border-info/20',
    iconBgClass: 'bg-info/20 text-info',
  },
};

export const UpgradeIncentive: React.FC<UpgradeIncentiveProps> = (props) => {
  const { type, className, onDismiss, dismissible = true } = props;
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const config = incentiveConfigs[type];

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={cn('relative rounded-lg border p-4', config.bgClass, className)}>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 transition-colors hover:bg-foreground/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className={cn('flex-shrink-0 rounded-full p-2', config.iconBgClass)}>
          {config.icon}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground">{config.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{config.getMessage(props)}</p>

          <Link href="/settings?tab=wallet" className="mt-3 block">
            <Button size="sm" className="gap-2">
              {config.ctaText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Inline banner version for smaller spaces
export const UpgradeIncentiveBanner: React.FC<
  Pick<UpgradeIncentiveProps, 'type' | 'className' | 'onDismiss' | 'postsRemaining' | 'totalPosts'>
> = ({ type, className, onDismiss, postsRemaining, totalPosts }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const isStorageWarning = type === 'storage-warning' || type === 'storage-critical';
  const isCritical = type === 'storage-critical';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg px-4 py-2 text-sm',
        isCritical ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 flex-shrink-0" />
        <span>
          {isStorageWarning
            ? `${postsRemaining}/${totalPosts} posts remaining.`
            : 'Upgrade to Hive for rewards!'}{' '}
          <Link href="/settings?tab=wallet" className="font-medium underline hover:no-underline">
            Connect wallet
          </Link>
        </span>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="rounded p-1 transition-colors hover:bg-foreground/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Toast-style notification for post-publish events
export const UpgradeIncentiveToast: React.FC<{
  type: 'post-published' | 'popular-post';
  likeCount?: number;
  onDismiss?: () => void;
  className?: string;
}> = ({ type, likeCount, onDismiss, className }) => {
  const isPopular = type === 'popular-post';

  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg border bg-card p-3 shadow-lg', className)}
    >
      <div
        className={cn(
          'rounded-full p-2',
          isPopular ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
        )}
      >
        {isPopular ? <TrendingUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {isPopular ? `${likeCount}+ likes! You could be earning.` : 'Post published!'}
        </p>
        <Link href="/settings?tab=wallet" className="text-xs text-primary hover:underline">
          {isPopular ? 'See potential earnings' : 'Upgrade to earn rewards'}
        </Link>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded p-1 transition-colors hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
};
