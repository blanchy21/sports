'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils/client';

interface CurationBadgeProps {
  totalMedals?: number;
  curatorCount?: number;
  className?: string;
}

/**
 * Small badge indicating a post has been curated with MEDALS.
 */
export function CurationBadge({
  totalMedals = 0,
  curatorCount = 0,
  className,
}: CurationBadgeProps) {
  if (totalMedals <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        'bg-sb-gold-shadow/60 text-xs font-medium text-sb-gold',
        className
      )}
      title={`Curated by ${curatorCount} curator${curatorCount !== 1 ? 's' : ''} — ${totalMedals} MEDALS`}
    >
      <Award className="h-3 w-3" />
      <span className="font-mono">{totalMedals}</span>
    </span>
  );
}
