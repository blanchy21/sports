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
    bgClass: 'bg-linear-to-r from-primary/10 to-accent/10 border-primary/20',
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
    bgClass: 'bg-linear-to-r from-green-500/10 to-emerald-500/10 border-green-500/20',
    iconBgClass: 'bg-green-500/20 text-green-600 dark:text-green-400',
  },
  'storage-warning': {
    icon: <Wallet className="h-5 w-5" />,
    title: 'Running low on storage',
    getMessage: (props) =>
      `You have ${props.postsRemaining || 10} posts remaining out of ${props.totalPosts || 50}. Upgrade to Hive for unlimited posts!`,
    ctaText: 'Upgrade Now',
    bgClass: 'bg-linear-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20',
    iconBgClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  },
  'storage-critical': {
    icon: <Wallet className="h-5 w-5" />,
    title: 'Almost out of storage!',
    getMessage: (props) =>
      `Only ${props.postsRemaining || 5} posts left! Connect a Hive wallet now to get unlimited storage and earn rewards.`,
    ctaText: 'Connect Hive Wallet',
    bgClass: 'bg-linear-to-r from-red-500/10 to-rose-500/10 border-red-500/20',
    iconBgClass: 'bg-red-500/20 text-red-600 dark:text-red-400',
  },
  milestone: {
    icon: <Award className="h-5 w-5" />,
    title: 'Congratulations!',
    getMessage: (props) =>
      `You've reached ${props.milestoneName || 'a milestone'}! Hive users earn MEDALS badges for achievements like this.`,
    ctaText: 'Learn About MEDALS',
    bgClass: 'bg-linear-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20',
    iconBgClass: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  },
  general: {
    icon: <Zap className="h-5 w-5" />,
    title: 'Unlock more features',
    getMessage: () =>
      'Connect a Hive wallet to earn rewards, vote on content, and unlock unlimited storage.',
    ctaText: 'Connect Wallet',
    bgClass: 'bg-linear-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20',
    iconBgClass: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
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
          className="hover:bg-foreground/10 absolute top-2 right-2 rounded-full p-1 transition-colors"
          aria-label="Dismiss"
        >
          <X className="text-muted-foreground h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className={cn('shrink-0 rounded-full p-2', config.iconBgClass)}>{config.icon}</div>

        <div className="min-w-0 flex-1">
          <h4 className="text-foreground font-semibold">{config.title}</h4>
          <p className="text-muted-foreground mt-1 text-sm">{config.getMessage(props)}</p>

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
        isCritical
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 shrink-0" />
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
          className="hover:bg-foreground/10 rounded p-1 transition-colors"
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
      className={cn('bg-card flex items-center gap-3 rounded-lg border p-3 shadow-lg', className)}
    >
      <div
        className={cn(
          'rounded-full p-2',
          isPopular
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-primary/10 text-primary'
        )}
      >
        {isPopular ? <TrendingUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {isPopular ? `${likeCount}+ likes! You could be earning.` : 'Post published!'}
        </p>
        <Link href="/settings?tab=wallet" className="text-primary text-xs hover:underline">
          {isPopular ? 'See potential earnings' : 'Upgrade to earn rewards'}
        </Link>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="hover:bg-muted rounded p-1 transition-colors"
          aria-label="Dismiss"
        >
          <X className="text-muted-foreground h-4 w-4" />
        </button>
      )}
    </div>
  );
};
