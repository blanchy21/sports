'use client';

import { cn } from '@/lib/utils/client';
import type { ContestStatus } from '@/generated/prisma/client';

const STATUS_CONFIG: Record<ContestStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-sb-turf text-muted-foreground' },
  REGISTRATION: { label: 'Open', className: 'bg-green-600 text-white border-green-700' },
  ACTIVE: { label: 'Live', className: 'bg-amber-500 text-white border-amber-600' },
  CALCULATING: { label: 'Calculating', className: 'bg-blue-500 text-white border-blue-600' },
  SETTLED: { label: 'Settled', className: 'bg-sb-turf text-muted-foreground' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive text-white border-destructive' },
};

export function ContestStatusBadge({
  status,
  comingSoon,
}: {
  status: ContestStatus;
  comingSoon?: boolean;
}) {
  const config = comingSoon
    ? { label: 'Coming Soon', className: 'bg-blue-500 text-white border-blue-600' }
    : STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {status === 'ACTIVE' && !comingSoon && (
        <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      )}
      {config.label}
    </span>
  );
}
