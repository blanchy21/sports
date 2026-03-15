'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/client';
import { PREMIUM_TIERS, type PremiumTier } from '@/lib/hive-engine/constants';
import { Sparkles } from 'lucide-react';

interface PremiumBadgeProps {
  /** The premium tier to display */
  tier: PremiumTier | null | undefined;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show the tier label text (ignored — kept for API compat) */
  showLabel?: boolean;
  /** Show the staked amount threshold */
  showThreshold?: boolean;
  /** Additional className */
  className?: string;
}

const TIER_ASSETS: Record<
  PremiumTier,
  { label: string; src: string; borderColor: string; iconColor: string; textColor: string }
> = {
  BRONZE: {
    label: 'Bronze',
    src: '/badges/staking/badge-bronze.png',
    borderColor: 'border-amber-600',
    iconColor: 'text-amber-700',
    textColor: 'text-amber-900',
  },
  SILVER: {
    label: 'Silver',
    src: '/badges/staking/badge-silver.png',
    borderColor: 'border-slate-400',
    iconColor: 'text-slate-500',
    textColor: 'text-slate-700',
  },
  GOLD: {
    label: 'Gold',
    src: '/badges/staking/badge-gold.png',
    borderColor: 'border-yellow-500',
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-900',
  },
  PLATINUM: {
    label: 'Platinum',
    src: '/badges/staking/badge-platinum.png',
    borderColor: 'border-purple-400',
    iconColor: 'text-purple-500',
    textColor: 'text-white',
  },
};

// Height in px — width auto-calculated from 4:5 aspect ratio
const SIZE_PX: Record<string, number> = {
  sm: 20,
  md: 28,
  lg: 40,
};

// Progress bar gradient colours (kept for PremiumTierProgress)
const TIER_BG_GRADIENT: Record<PremiumTier, string> = {
  BRONZE: 'bg-gradient-to-r from-amber-700 to-amber-600',
  SILVER: 'bg-gradient-to-r from-slate-400 to-slate-300',
  GOLD: 'bg-gradient-to-r from-yellow-500 to-amber-400',
  PLATINUM: 'bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400',
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

function formatThreshold(amount: number): string {
  return amount.toLocaleString();
}

/**
 * PremiumBadge — renders the custom badge asset image.
 */
export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  tier,
  size = 'md',
  showThreshold = false,
  className,
}) => {
  if (!tier) return null;

  const asset = TIER_ASSETS[tier];
  const h = SIZE_PX[size];
  const w = Math.round(h * (115 / 144));

  return (
    <div
      className={cn('inline-flex shrink-0 items-center gap-1', className)}
      title={`${asset.label} tier — ${formatThreshold(PREMIUM_TIERS[tier])}+ MEDALS staked`}
    >
      <Image
        src={asset.src}
        alt={`${asset.label} staking tier badge`}
        width={w}
        height={h}
        className="object-contain"
        priority={false}
      />
      {showThreshold && (
        <span className="text-xs text-muted-foreground">
          ({formatThreshold(PREMIUM_TIERS[tier])}+)
        </span>
      )}
    </div>
  );
};

/**
 * PremiumBadgeOutline — outline variant showing tier name for progress displays.
 */
export const PremiumBadgeOutline: React.FC<PremiumBadgeProps> = ({
  tier,
  size = 'md',
  className,
}) => {
  if (!tier) return null;

  const asset = TIER_ASSETS[tier];
  const h = SIZE_PX[size];
  const w = Math.round(h * (115 / 144));

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border-2 bg-background px-1.5 py-0.5',
        asset.borderColor,
        className
      )}
      title={`${asset.label} tier — ${formatThreshold(PREMIUM_TIERS[tier])}+ MEDALS staked`}
    >
      <Image
        src={asset.src}
        alt={`${asset.label} tier`}
        width={w}
        height={h}
        className="object-contain"
        priority={false}
      />
      <span className={cn('text-xs font-semibold', asset.textColor)}>{asset.label}</span>
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

  const tiers = Object.entries(PREMIUM_TIERS) as [PremiumTier, number][];
  const currentTierIndex = currentTier ? tiers.findIndex(([t]) => t === currentTier) : -1;

  const nextTierEntry = tiers[currentTierIndex + 1];
  const currentTierEntry = currentTier ? tiers[currentTierIndex] : null;

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

  const nextGradient = TIER_BG_GRADIENT[nextTierName];

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
          className={cn('absolute h-full rounded-full transition-all duration-500', nextGradient)}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatThreshold(currentStaked)} MEDALS staked</span>
        <span>
          {formatThreshold(remaining)} more to {TIER_ASSETS[nextTierName].label}
        </span>
      </div>
    </div>
  );
};

export default PremiumBadge;
