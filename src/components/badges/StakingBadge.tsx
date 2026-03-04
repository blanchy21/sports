'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { PREMIUM_TIERS, type PremiumTier } from '@/lib/hive-engine/constants';
import { Crown, Award, Star, Medal } from 'lucide-react';

interface StakingBadgeProps {
  tier: PremiumTier | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TIER_CONFIG: Record<
  PremiumTier,
  {
    label: string;
    icon: typeof Crown;
    bgGradient: string;
    glowColor: string;
    ringColor: string;
    shadow: string;
  }
> = {
  BRONZE: {
    label: 'Bronze',
    icon: Medal,
    bgGradient: 'bg-gradient-to-r from-amber-700 to-amber-600',
    glowColor: 'shadow-amber-500/20',
    ringColor: 'ring-amber-600/30',
    shadow: 'shadow-md',
  },
  SILVER: {
    label: 'Silver',
    icon: Star,
    bgGradient: 'bg-gradient-to-r from-slate-400 to-slate-300',
    glowColor: 'shadow-slate-400/30',
    ringColor: 'ring-slate-400/30',
    shadow: 'shadow-lg',
  },
  GOLD: {
    label: 'Gold',
    icon: Award,
    bgGradient: 'bg-gradient-to-r from-yellow-500 to-amber-400',
    glowColor: 'shadow-yellow-500/40',
    ringColor: 'ring-yellow-500/30',
    shadow: 'shadow-xl',
  },
  PLATINUM: {
    label: 'Platinum',
    icon: Crown,
    bgGradient: 'bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400',
    glowColor: 'shadow-purple-500/50',
    ringColor: 'ring-purple-400/30',
    shadow: 'shadow-xl',
  },
};

const SIZE_CONFIG = {
  sm: { badge: 'px-2 py-0.5 text-xs', icon: 'h-3 w-3' },
  md: { badge: 'px-2.5 py-1 text-sm', icon: 'h-4 w-4' },
  lg: { badge: 'px-3 py-1.5 text-base', icon: 'h-5 w-5' },
};

const shimmerStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%)',
  backgroundSize: '200% 100%',
  animation: 'staking-shimmer 3s ease-in-out infinite',
};

/**
 * Enhanced staking tier badge with metallic shimmer.
 * Used on profile pages and leaderboard rows for premium visual treatment.
 */
export const StakingBadge: React.FC<StakingBadgeProps> = ({ tier, size = 'md', className }) => {
  if (!tier) return null;

  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;
  const isPlatinum = tier === 'PLATINUM';

  return (
    <>
      <style>{`@keyframes staking-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <span
        className={cn(
          'relative inline-flex items-center gap-1.5 overflow-hidden rounded-full font-semibold ring-2',
          config.bgGradient,
          config.shadow,
          config.glowColor,
          config.ringColor,
          sizeConfig.badge,
          isPlatinum && 'animate-pulse',
          className
        )}
        title={`${config.label} tier — ${PREMIUM_TIERS[tier].toLocaleString()}+ MEDALS staked`}
      >
        <span className="pointer-events-none absolute inset-0" style={shimmerStyle} aria-hidden />
        <Icon className={cn(sizeConfig.icon, 'relative text-white drop-shadow-sm')} />
        <span className="relative text-white drop-shadow-sm">{config.label}</span>
      </span>
    </>
  );
};
