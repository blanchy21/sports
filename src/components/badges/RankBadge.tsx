'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { RANK_TIERS } from '@/lib/badges/catalogue';
import type { MedalsRank } from '@/lib/badges/types';
import { Trophy, Crown, Award, BarChart3, Swords, User } from 'lucide-react';

const RANK_ICONS: Record<string, React.ElementType> = {
  Trophy,
  Crown,
  Award,
  BarChart3,
  Swords,
  User,
};

interface RankBadgeProps {
  rank: MedalsRank | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, size = 'sm', className }) => {
  if (!rank) return null;

  const tier = RANK_TIERS.find((t) => t.rank === rank);
  if (!tier) return null;

  const Icon = RANK_ICONS[tier.icon] ?? User;

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs';
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold text-white',
        tier.bgGradient,
        sizeClasses,
        className
      )}
      title={`MEDALS Rank: ${tier.label}`}
    >
      <Icon className={iconSize} />
      {tier.label}
    </span>
  );
};
