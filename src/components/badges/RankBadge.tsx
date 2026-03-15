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

// Height in px — width auto-calculated from 4:5 aspect ratio (160:200)
const SIZE_PX: Record<string, number> = {
  sm: 32,
  md: 44,
  lg: 64,
};

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, size = 'sm', className }) => {
  if (!rank) return null;

  const asset = RANK_ASSETS[rank];
  if (!asset) return null;

  const h = SIZE_PX[size];
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
        className="object-contain"
        priority={false}
      />
    </div>
  );
};
