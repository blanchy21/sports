'use client';

import React, { useState, useCallback } from 'react';
import { Award, Loader2, CheckCircle } from 'lucide-react';
import { useCuratorStatus } from '@/hooks/useCuratorStatus';
import { CURATION_MEDALS_AMOUNT } from '@/lib/curation/config';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/client';
import { toast } from '@/components/core/Toast';

interface CurateButtonProps {
  author: string;
  permlink: string;
  /** If already curated, show as curated state */
  alreadyCurated?: boolean;
  className?: string;
}

/**
 * Button for curators to award MEDALS to a post. Hidden for non-curators.
 */
export function CurateButton({
  author,
  permlink,
  alreadyCurated = false,
  className,
}: CurateButtonProps) {
  const { isCurator, remaining, isLoading: statusLoading } = useCuratorStatus();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [curated, setCurated] = useState(alreadyCurated);
  const queryClient = useQueryClient();

  const handleCurate = useCallback(async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/curation/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, permlink }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Curation failed');
        setConfirming(false);
        return;
      }

      setCurated(true);
      setConfirming(false);
      toast.success(`${CURATION_MEDALS_AMOUNT} MEDALS awarded to @${author}`);

      // Invalidate curator status to update remaining count
      queryClient.invalidateQueries({ queryKey: ['curatorStatus'] });
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [confirming, author, permlink, queryClient]);

  const handleCancel = useCallback(() => {
    setConfirming(false);
  }, []);

  // Don't render for non-curators
  if (statusLoading || !isCurator) return null;

  // Already curated state
  if (curated) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs font-medium text-sb-gold', className)}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Curated
      </span>
    );
  }

  // No remaining curations
  if (remaining <= 0) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs text-sb-text-muted', className)}
        title="Daily curation limit reached"
      >
        <Award className="h-3.5 w-3.5" />0 left
      </span>
    );
  }

  // Confirmation state
  if (confirming) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <button
          onClick={handleCurate}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-full bg-sb-gold px-2.5 py-1 text-xs font-semibold text-black transition-colors hover:bg-sb-gold-shine disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Award className="h-3 w-3" />
          )}
          {submitting ? 'Awarding...' : `Award ${CURATION_MEDALS_AMOUNT} MEDALS`}
        </button>
        <button
          onClick={handleCancel}
          disabled={submitting}
          className="rounded-full px-2 py-1 text-xs text-sb-text-muted transition-colors hover:text-sb-text-primary"
        >
          Cancel
        </button>
      </span>
    );
  }

  // Default state
  return (
    <button
      onClick={handleCurate}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1',
        'text-xs font-medium text-sb-gold',
        'transition-colors hover:bg-sb-gold-shadow/40',
        className
      )}
      title={`Curate — ${remaining} curations remaining today`}
    >
      <Award className="h-3.5 w-3.5" />
      Curate
    </button>
  );
}
