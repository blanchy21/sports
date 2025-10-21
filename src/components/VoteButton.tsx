"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Heart, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { useVoting } from "@/hooks/useVoting";
import { cn } from "@/lib/utils";
import { VoteResult } from "@/lib/hive-workerbee/voting";

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

  const handleUpvote = () => {
    if (voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight > 0) {
      // Already upvoted, remove vote
      handleVote('remove');
    } else {
      // Upvote
      handleVote('upvote');
    }
  };

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
  const isUpvoted = voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight > 0;
  const isDownvoted = voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight < 0;
  const isDisabled = voteState.isVoting || !voteState.canVote;

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {/* Upvote Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUpvote}
        disabled={isDisabled}
        className={cn(
          "flex items-center space-x-1 h-8 px-2",
          isUpvoted
            ? "text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/20"
            : "text-muted-foreground hover:text-accent",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
        title={
          !voteState.canVote
            ? "Insufficient voting power or not authenticated"
            : isUpvoted
            ? "Remove upvote"
            : "Upvote this post"
        }
      >
        {voteState.isVoting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ChevronUp className={cn("h-3 w-3", isUpvoted && "fill-current")} />
        )}
        <span className="text-xs font-medium">{voteCount}</span>
      </Button>

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

      {/* Voting Power Indicator */}
      {voteState.canVote && (
        <div className="ml-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Heart className="h-3 w-3" />
            <span>{voteState.votingPower.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {voteState.error && (
        <div className="ml-2 text-xs text-red-600">
          {voteState.error}
        </div>
      )}
    </div>
  );
};

// Alternative simpler vote button for mobile or compact views
export const SimpleVoteButton: React.FC<VoteButtonProps> = ({
  author,
  permlink,
  voteCount,
  className,
  onVoteSuccess,
  onVoteError,
}) => {
  const { voteState, upvote, checkVoteStatus } = useVoting(author, permlink);

  React.useEffect(() => {
    checkVoteStatus(author, permlink);
  }, [checkVoteStatus, author, permlink]);

  const handleVote = async () => {
    const result = await upvote(author, permlink);
    
    if (result.success) {
      onVoteSuccess?.(result);
    } else {
      onVoteError?.(result.error || 'Vote failed');
    }
  };

  const isUpvoted = voteState.hasVoted && voteState.userVote?.weight && voteState.userVote.weight > 0;
  const isDisabled = voteState.isVoting || !voteState.canVote;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleVote}
      disabled={isDisabled}
      className={cn(
        "flex items-center space-x-1 text-muted-foreground hover:text-red-500",
        isUpvoted && "text-red-500",
        className
      )}
      title={
        !voteState.canVote
          ? "Insufficient voting power or not authenticated"
          : isUpvoted
          ? "Remove vote"
          : "Upvote this post"
      }
    >
      {voteState.isVoting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", isUpvoted && "fill-current")} />
      )}
      <span>{voteCount}</span>
    </Button>
  );
};
