"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { ChevronDown } from "lucide-react";
import { useVoting } from "@/hooks/useVoting";
import { cn } from "@/lib/utils";
import { VoteResult } from "@/lib/hive-workerbee/voting";
import { StarVoteButton } from "@/components/StarVoteButton";

interface VoteButtonProps {
  author: string;
  permlink: string;
  voteCount: number;
  className?: string;
  onVoteSuccess?: (result: VoteResult) => void;
  onVoteError?: (error: string) => void;
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  author,
  permlink,
  voteCount,
  className,
  onVoteSuccess,
  onVoteError,
}) => {
  const { voteState, upvote, downvote, removeVoteAction, checkVoteStatus } = useVoting(author, permlink);

  // Check vote status when component mounts
  React.useEffect(() => {
    checkVoteStatus(author, permlink);
  }, [checkVoteStatus, author, permlink]);

  const handleVote = async (voteType: 'upvote' | 'downvote' | 'remove') => {
    let result: VoteResult;
    
    switch (voteType) {
      case 'upvote':
        result = await upvote(author, permlink);
        break;
      case 'downvote':
        result = await downvote(author, permlink);
        break;
      case 'remove':
        result = await removeVoteAction(author, permlink);
        break;
      default:
        return;
    }

    if (result.success) {
      onVoteSuccess?.(result);
    } else {
      onVoteError?.(result.error || 'Vote failed');
    }
  };

  // Star voting is handled by StarVoteButton component

  const handleDownvote = () => {
    if (voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight < 0) {
      // Already downvoted, remove vote
      handleVote('remove');
    } else {
      // Downvote
      handleVote('downvote');
    }
  };

  // Determine button states
  const isDownvoted = voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight < 0;
  const isDisabled = voteState.isVoting || !voteState.canVote;

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {/* Star Rating for Upvote */}
      <StarVoteButton
        author={author}
        permlink={permlink}
        voteCount={voteCount}
        onVoteSuccess={onVoteSuccess}
        onVoteError={onVoteError}
        className="flex-shrink-0"
      />

      {/* Downvote Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownvote}
        disabled={isDisabled}
        className={cn(
          "flex items-center space-x-1 h-8 px-2",
          isDownvoted
            ? "text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
            : "text-muted-foreground hover:text-red-600",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
        title={
          !voteState.canVote
            ? "Insufficient voting power or not authenticated"
            : isDownvoted
            ? "Remove downvote"
            : "Downvote this post"
        }
      >
        <ChevronDown className={cn("h-3 w-3", isDownvoted && "fill-current")} />
      </Button>

      {/* Voting power and error display are now handled by StarVoteButton */}
    </div>
  );
};

// Alternative simpler vote button for mobile or compact views - now uses star rating
export const SimpleVoteButton: React.FC<VoteButtonProps> = ({
  author,
  permlink,
  voteCount,
  className,
  onVoteSuccess,
  onVoteError,
}) => {
  return (
    <StarVoteButton
      author={author}
      permlink={permlink}
      voteCount={voteCount}
      onVoteSuccess={onVoteSuccess}
      onVoteError={onVoteError}
      className={className}
    />
  );
};
