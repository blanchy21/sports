'use client';

import React, { useState, useCallback } from 'react';
import { Award, Loader2, CheckCircle } from 'lucide-react';
import { useCuratorStatus } from '@/hooks/useCuratorStatus';
import { CURATION_MEDALS_AMOUNT } from '@/lib/curation/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/client';
import { toast } from '@/components/core/Toast';
import { useAuth } from '@/contexts/AuthContext';

interface CurateButtonProps {
  author: string;
  permlink: string;
  /** If already curated, show as curated state */
  alreadyCurated?: boolean;
  className?: string;
}

/**
 * Button for curators to award MEDALS to a post. Hidden for non-curators.
 * Checks the curation status API on mount to persist "Curated" state across page loads.
 */
export function CurateButton({
  author,
  permlink,
  alreadyCurated = false,
  className,
}: CurateButtonProps) {
  const { isCurator, remaining, isLoading: statusLoading } = useCuratorStatus();
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justCurated, setJustCurated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check if this post has already been curated by the current user
  const { data: curationStatus } = useQuery({
    queryKey: ['curationStatus', author, permlink],
    queryFn: async () => {
      const res = await fetch(
        `/api/curation/status?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`
      );
      if (!res.ok) return { curated: false, curations: [] };
      return res.json();
    },
    enabled: isCurator && !alreadyCurated,
    staleTime: 5 * 60 * 1000,
  });

  // Check if current user has curated this post
  const isCuratedByMe =
    alreadyCurated ||
    justCurated ||
    (curationStatus?.curations ?? []).some(
      (c: { curator: string }) => c.curator === user?.username
    );

  const handleCurate = useCallback(async () => {
    if (!confirming) {
      setConfirming(true);
      setError(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/curation/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, permlink }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || 'Curation failed';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setJustCurated(true);
      setConfirming(false);
      toast.success(`${CURATION_MEDALS_AMOUNT} MEDALS awarded to @${author}`);

      // Invalidate queries to update counts and status
      queryClient.invalidateQueries({ queryKey: ['curatorStatus'] });
      queryClient.invalidateQueries({ queryKey: ['curationStatus', author, permlink] });
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [confirming, author, permlink, queryClient]);

  const handleCancel = useCallback(() => {
    setConfirming(false);
    setError(null);
  }, []);

  // Don't render for non-curators
  if (statusLoading || !isCurator) return null;

  // Already curated state
  if (isCuratedByMe) {
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
      <span className={cn('inline-flex flex-col gap-1', className)}>
        <span className="inline-flex items-center gap-1">
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
        {error && <span className="text-[10px] text-red-400">{error}</span>}
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
