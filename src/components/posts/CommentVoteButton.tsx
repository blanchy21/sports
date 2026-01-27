'use client';

import React from 'react';
import { Button } from '@/components/core/Button';
import { ChevronUp, Loader2 } from 'lucide-react';
import { useVoting } from '@/features/hive/hooks/useVoting';
import { cn } from '@/lib/utils/client';
import { VoteResult } from '@/lib/hive-workerbee/voting';

interface CommentVoteButtonProps {
  author: string;
  permlink: string;
  voteCount: number;
  className?: string;
  onVoteSuccess?: (result: VoteResult) => void;
  onVoteError?: (error: string) => void;
}

export const CommentVoteButton: React.FC<CommentVoteButtonProps> = ({
  author,
  permlink,
  voteCount,
  className,
  onVoteSuccess,
  onVoteError,
}) => {
  const { voteState, commentVote, checkVoteStatus } = useVoting(author, permlink);

  // Check vote status when component mounts
  React.useEffect(() => {
    checkVoteStatus(author, permlink);
  }, [checkVoteStatus, author, permlink]);

  const handleVote = async () => {
    if (!voteState.canVote || voteState.isVoting) return;

    // If already voted, remove vote; otherwise cast 20% vote
    if (voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight > 0) {
      const result = await commentVote(author, permlink, 0);
      if (result.success) {
        onVoteSuccess?.(result);
      } else {
        onVoteError?.(result.error || 'Vote failed');
      }
    } else {
      // Cast 20% vote
      const result = await commentVote(author, permlink, 20);
      if (result.success) {
        onVoteSuccess?.(result);
      } else {
        onVoteError?.(result.error || 'Vote failed');
      }
    }
  };

  const isVoted = voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight > 0;
  const isDisabled = voteState.isVoting || !voteState.canVote;

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVote}
        disabled={isDisabled}
        className={cn(
          'flex h-6 items-center space-x-1 px-2 text-xs',
          isVoted
            ? 'bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent/80'
            : 'text-muted-foreground hover:text-accent',
          isDisabled && 'cursor-not-allowed opacity-50'
        )}
        title={
          !voteState.canVote
            ? 'Insufficient voting power or not authenticated'
            : voteState.isVoting
              ? 'Vote in progress...'
              : isVoted
                ? 'Remove vote (20%)'
                : 'Vote 20%'
        }
      >
        {voteState.isVoting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ChevronUp className={cn('h-3 w-3', isVoted && 'fill-current')} />
        )}
        <span className="font-medium">{voteCount}</span>
      </Button>

      {/* Error Display */}
      {voteState.error && <div className="ml-1 text-xs text-red-600">{voteState.error}</div>}
    </div>
  );
};
