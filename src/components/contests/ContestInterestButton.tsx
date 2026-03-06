'use client';

import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useContestInterestToggle } from '@/lib/react-query/queries/useContests';
import { toast } from '@/components/core/Toast';
import { cn } from '@/lib/utils/client';

export function ContestInterestButton({
  slug,
  isInterested,
  interestCount,
}: {
  slug: string;
  isInterested: boolean;
  interestCount: number;
}) {
  const { user } = useAuth();
  const { mutate, isPending } = useContestInterestToggle(slug);

  function handleClick() {
    if (!user) {
      toast.error('Please sign in to express interest');
      return;
    }
    mutate();
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
        isInterested
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
          : 'border-border bg-card text-muted-foreground hover:border-rose-500/30 hover:text-rose-500',
        isPending && 'opacity-60 pointer-events-none'
      )}
    >
      <Heart
        className={cn('h-4 w-4 transition-all', isInterested && 'fill-current')}
      />
      {isInterested ? 'Interested' : "I'm Interested"}
      {interestCount > 0 && (
        <span className="tabular-nums text-xs opacity-70">{interestCount}</span>
      )}
    </button>
  );
}
