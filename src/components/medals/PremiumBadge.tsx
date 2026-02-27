'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { PREMIUM_TIERS, type PremiumTier } from '@/lib/hive-engine/constants';
import { Crown, Award, Star, Medal, Sparkles } from 'lucide-react';

interface PremiumBadgeProps {
  /** The premium tier to display */
  tier: PremiumTier | null | undefined;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show the tier label text */
  showLabel?: boolean;
  /** Show the staked amount threshold */
  showThreshold?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Tier-specific configuration
 */
const TIER_CONFIG: Record<
  PremiumTier,
  {
    label: string;
    icon: typeof Crown;
    bgGradient: string;
    textColor: string;
    borderColor: string;
    iconColor: string;
    glowColor: string;
  }
> = {
  BRONZE: {
    label: 'Bronze',
    icon: Medal,
    bgGradient: 'bg-gradient-to-r from-amber-700 to-amber-600',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-600',
    iconColor: 'text-amber-700',
    glowColor: 'shadow-amber-500/20',
  },
  SILVER: {
    label: 'Silver',
    icon: Star,
    bgGradient: 'bg-gradient-to-r from-slate-400 to-slate-300',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-400',
    iconColor: 'text-slate-500',
    glowColor: 'shadow-slate-400/30',
  },
  GOLD: {
    label: 'Gold',
    icon: Award,
    bgGradient: 'bg-gradient-to-r from-yellow-500 to-amber-400',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-500',
    iconColor: 'text-yellow-600',
    glowColor: 'shadow-yellow-500/40',
  },
  PLATINUM: {
    label: 'Platinum',
    icon: Crown,
    bgGradient: 'bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400',
    textColor: 'text-white',
    borderColor: 'border-purple-400',
    iconColor: 'text-purple-500',
    glowColor: 'shadow-purple-500/50',
  },
};

/**
 * Size configurations for the badge
 */
const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'h-3 w-3',
    iconOnly: 'w-5 h-5',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    icon: 'h-4 w-4',
    iconOnly: 'w-6 h-6',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    icon: 'h-5 w-5',
    iconOnly: 'w-8 h-8',
  },
};

/**
 * Get premium tier based on staked amount
 */
export function getPremiumTier(stakedAmount: number): PremiumTier | null {
  if (stakedAmount >= PREMIUM_TIERS.PLATINUM) return 'PLATINUM';
  if (stakedAmount >= PREMIUM_TIERS.GOLD) return 'GOLD';
  if (stakedAmount >= PREMIUM_TIERS.SILVER) return 'SILVER';
  if (stakedAmount >= PREMIUM_TIERS.BRONZE) return 'BRONZE';
  return null;
}

/**
 * Format number with thousands separators
 */
function formatThreshold(amount: number): string {
  return amount.toLocaleString();
}

/**
 * PremiumBadge component displays the user's premium tier based on staked MEDALS
 */
export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  tier,
  size = 'md',
  showLabel = true,
  showThreshold = false,
  className,
}) => {
  // Don't render if no tier
  if (!tier) return null;

  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  // Icon-only mode when label is hidden
  if (!showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          config.bgGradient,
          `shadow-lg ${config.glowColor}`,
          sizeConfig.iconOnly,
          className
        )}
        title={`${config.label} tier - ${formatThreshold(PREMIUM_TIERS[tier])}+ MEDALS staked`}
      >
        <Icon className={cn(sizeConfig.icon, 'text-white drop-shadow-sm')} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        config.bgGradient,
        `shadow-md ${config.glowColor}`,
        sizeConfig.badge,
        className
      )}
      title={`${formatThreshold(PREMIUM_TIERS[tier])}+ MEDALS staked`}
    >
      <Icon className={cn(sizeConfig.icon, 'text-white drop-shadow-sm')} />
      <span className="text-white drop-shadow-sm">{config.label}</span>
      {showThreshold && (
        <span className="ml-1 text-xs text-white/80">
          ({formatThreshold(PREMIUM_TIERS[tier])}+)
        </span>
      )}
    </div>
  );
};

/**
 * PremiumBadgeOutline - An outline variant for lighter backgrounds
 */
export const PremiumBadgeOutline: React.FC<PremiumBadgeProps> = ({
  tier,
  size = 'md',
  showLabel = true,
  showThreshold = false,
  className,
}) => {
  if (!tier) return null;

  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  if (!showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full border-2 bg-background',
          config.borderColor,
          sizeConfig.iconOnly,
          className
        )}
        title={`${config.label} tier - ${formatThreshold(PREMIUM_TIERS[tier])}+ MEDALS staked`}
      >
        <Icon className={cn(sizeConfig.icon, config.iconColor)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 bg-background font-semibold',
        config.borderColor,
        config.textColor,
        sizeConfig.badge,
        className
      )}
      title={`${formatThreshold(PREMIUM_TIERS[tier])}+ MEDALS staked`}
    >
      <Icon className={cn(sizeConfig.icon, config.iconColor)} />
      <span>{config.label}</span>
      {showThreshold && (
        <span className="ml-1 text-xs opacity-70">({formatThreshold(PREMIUM_TIERS[tier])}+)</span>
      )}
    </div>
  );
};

/**
 * PremiumTierProgress - Shows progress towards next tier
 */
interface PremiumTierProgressProps {
  currentStaked: number;
  className?: string;
}

export const PremiumTierProgress: React.FC<PremiumTierProgressProps> = ({
  currentStaked,
  className,
}) => {
  const currentTier = getPremiumTier(currentStaked);

  // Determine next tier and progress
  const tiers = Object.entries(PREMIUM_TIERS) as [PremiumTier, number][];
  const currentTierIndex = currentTier ? tiers.findIndex(([t]) => t === currentTier) : -1;

  const nextTierEntry = tiers[currentTierIndex + 1];
  const currentTierEntry = currentTier ? tiers[currentTierIndex] : null;

  // If already at max tier
  if (!nextTierEntry) {
    return (
      <div className={cn('text-center', className)}>
        <div className="mb-2 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-purple-600">Maximum Tier Achieved!</span>
        </div>
        <PremiumBadge tier="PLATINUM" size="lg" />
      </div>
    );
  }

  const [nextTierName, nextTierThreshold] = nextTierEntry;
  const currentTierThreshold = currentTierEntry ? currentTierEntry[1] : 0;

  const progressInTier = currentStaked - currentTierThreshold;
  const tierRange = nextTierThreshold - currentTierThreshold;
  const progressPercent = Math.min(100, Math.max(0, (progressInTier / tierRange) * 100));
  const remaining = nextTierThreshold - currentStaked;

  const nextConfig = TIER_CONFIG[nextTierName];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {currentTier ? (
            <PremiumBadge tier={currentTier} size="sm" />
          ) : (
            <span className="text-muted-foreground">No tier</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Next:</span>
          <PremiumBadgeOutline tier={nextTierName} size="sm" />
        </div>
      </div>

      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'absolute h-full rounded-full transition-all duration-500',
            nextConfig.bgGradient
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatThreshold(currentStaked)} MEDALS staked</span>
        <span>
          {formatThreshold(remaining)} more to {nextConfig.label}
        </span>
      </div>
    </div>
  );
};

export default PremiumBadge;
