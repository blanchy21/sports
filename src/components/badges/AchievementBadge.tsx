'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import type { BadgeDefinition } from '@/lib/badges/types';
import {
  PenLine,
  BookOpen,
  Newspaper,
  Zap,
  Flame,
  MessageSquare,
  MessagesSquare,
  Users,
  TrendingUp,
  Target,
  Crosshair,
  Eye,
  Trophy,
  Clock,
  Shield,
  Gem,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  PenLine,
  BookOpen,
  Newspaper,
  Zap,
  Flame,
  MessageSquare,
  MessagesSquare,
  Users,
  TrendingUp,
  Target,
  Crosshair,
  Eye,
  Trophy,
  Clock,
  Shield,
  Gem,
};

interface AchievementBadgeProps {
  badge: Pick<
    BadgeDefinition,
    'id' | 'name' | 'description' | 'icon' | 'bgGradient' | 'textColor' | 'glowColor'
  >;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

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

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  badge,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const Icon = ICON_MAP[badge.icon] ?? Trophy;
  const sizeConfig = SIZE_CONFIG[size];

  if (!showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          badge.bgGradient,
          `shadow-lg ${badge.glowColor}`,
          sizeConfig.iconOnly,
          className
        )}
        title={`${badge.name} — ${badge.description}`}
      >
        <Icon className={cn(sizeConfig.icon, 'text-white drop-shadow-sm')} />
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full font-semibold',
          badge.bgGradient,
          `shadow-md ${badge.glowColor}`,
          sizeConfig.badge,
          className
        )}
        title={badge.description}
      >
        <Icon className={cn(sizeConfig.icon, 'text-white drop-shadow-sm')} />
        <div className="flex flex-col leading-tight">
          <span className="text-white drop-shadow-sm">{badge.name}</span>
          <span className="text-xs text-white/80">{badge.description}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        badge.bgGradient,
        `shadow-md ${badge.glowColor}`,
        sizeConfig.badge,
        className
      )}
      title={badge.description}
    >
      <Icon className={cn(sizeConfig.icon, 'text-white drop-shadow-sm')} />
      <span className="text-white drop-shadow-sm">{badge.name}</span>
    </div>
  );
};
