'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/client';
import { PREMIUM_TIERS, type PremiumTier } from '@/lib/hive-engine/constants';

interface StakingBadgeProps {
  tier: PremiumTier | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TIER_ASSETS: Record<PremiumTier, { label: string; src: string }> = {
  BRONZE: { label: 'Bronze', src: '/badges/staking/badge-bronze.png' },
  SILVER: { label: 'Silver', src: '/badges/staking/badge-silver.png' },
  GOLD: { label: 'Gold', src: '/badges/staking/badge-gold.png' },
  PLATINUM: { label: 'Platinum', src: '/badges/staking/badge-platinum.png' },
};

// Height in px — width auto-calculated from 4:5 aspect ratio
const SIZE_PX: Record<string, number> = {
  sm: 32,
  md: 44,
  lg: 64,
};

/**
 * Staking tier badge using custom designed assets.
 * Used on profile pages and leaderboard rows.
 */
export const StakingBadge: React.FC<StakingBadgeProps> = ({ tier, size = 'md', className }) => {
  if (!tier) return null;

  const asset = TIER_ASSETS[tier];
  const h = SIZE_PX[size];
  const w = Math.round(h * (115 / 144)); // preserve 4:5 aspect ratio

  return (
    <div
      className={cn('inline-flex shrink-0 items-center', className)}
      title={`${asset.label} tier — ${PREMIUM_TIERS[tier].toLocaleString()}+ MEDALS staked`}
    >
      <Image
        src={asset.src}
        alt={`${asset.label} staking tier badge`}
        width={w}
        height={h}
        className="object-contain"
        priority={false}
      />
    </div>
  );
};
