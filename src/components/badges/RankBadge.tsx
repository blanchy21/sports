'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/client';
import type { MedalsRank } from '@/lib/badges/types';

interface RankBadgeProps {
  rank: MedalsRank | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RANK_ASSETS: Record<MedalsRank, { label: string; src: string }> = {
  rookie: { label: 'Rookie', src: '/badges/roles/rookie.png' },
  contender: { label: 'Contender', src: '/badges/roles/contender.png' },
  analyst: { label: 'Analyst', src: '/badges/roles/analyst.png' },
  pundit: { label: 'Pundit', src: '/badges/roles/pundit.png' },
  legend: { label: 'Legend', src: '/badges/roles/legend.png' },
  'hall-of-fame': { label: 'Hall of Fame', src: '/badges/roles/hall-of-fame.png' },
};

// Responsive height classes: smaller on mobile, full size on sm+ breakpoint
const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-[56px] sm:h-[96px]',
  md: 'h-[64px] sm:h-[112px]',
  lg: 'h-[80px] sm:h-[140px]',
};

// Render at largest size — CSS constrains the visual height
const RENDER_PX: Record<string, number> = {
  sm: 96,
  md: 112,
  lg: 140,
};

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, size = 'sm', className }) => {
  if (!rank) return null;

  const asset = RANK_ASSETS[rank];
  if (!asset) return null;

  const h = RENDER_PX[size];
  const w = Math.round(h * (160 / 200)); // 4:5 aspect ratio

  return (
    <div
      className={cn('inline-flex shrink-0 items-center', className)}
      title={`MEDALS Rank: ${asset.label}`}
    >
      <Image
        src={asset.src}
        alt={`${asset.label} rank badge`}
        width={w}
        height={h}
        className={cn('w-auto object-contain', SIZE_CLASSES[size])}
        priority={false}
      />
    </div>
  );
};
