'use client';

import { cn } from '@/lib/utils/client';
import type { ContestStatus } from '@/generated/prisma/client';

const STATUS_CONFIG: Record<ContestStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  REGISTRATION: { label: 'Open', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  ACTIVE: { label: 'Live', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  CALCULATING: { label: 'Calculating', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  SETTLED: { label: 'Settled', className: 'bg-muted text-muted-foreground' },
  CANCELLED: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function ContestStatusBadge({
  status,
  comingSoon,
}: {
  status: ContestStatus;
  comingSoon?: boolean;
}) {
  const config = comingSoon
    ? { label: 'Coming Soon', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
    : STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {status === 'ACTIVE' && !comingSoon && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
