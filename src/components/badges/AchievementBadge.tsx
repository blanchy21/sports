'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/client';
import type { BadgeDefinition } from '@/lib/badges/types';

interface AchievementBadgeProps {
  badge: Pick<BadgeDefinition, 'id' | 'name' | 'description' | 'color' | 'glow' | 'imageSrc'>;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE_PX = {
  sm: 28,
  md: 36,
  lg: 52,
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  badge,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const px = SIZE_PX[size];

  if (badge.imageSrc) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5', className)}
        title={`${badge.name} — ${badge.description}`}
      >
        <Image
          src={badge.imageSrc}
          alt={badge.name}
          width={px}
          height={px}
          className="object-contain"
        />
        {showLabel && (
          <span className="text-xs font-medium" style={{ color: badge.color }}>
            {badge.name}
          </span>
        )}
      </span>
    );
  }

  // Fallback: colored pill for badges without a PNG asset
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        badge.glow && 'shadow-md',
        className
      )}
      style={{
        background: `${badge.color}18`,
        border: `1px solid ${badge.color}40`,
        color: badge.color,
        ...(badge.glow ? { boxShadow: `0 0 8px ${badge.color}30` } : {}),
      }}
      title={`${badge.name} — ${badge.description}`}
    >
      {badge.name}
    </span>
  );
};
