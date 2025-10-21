"use client";

import React, { useState, useCallback } from "react";
import { Star, Loader2 } from "lucide-react";
import { useVoting } from "@/hooks/useVoting";
import { cn } from "@/lib/utils";
import { VoteResult } from "@/lib/hive-workerbee/voting";

interface StarVoteButtonProps {
  author: string;
  permlink: string;
  voteCount: number;
  className?: string;
  onVoteSuccess?: (result: VoteResult) => void;
  onVoteError?: (error: string) => void;
}

export const StarVoteButton: React.FC<StarVoteButtonProps> = ({
  author,
  permlink,
  voteCount,
  className,
  onVoteSuccess,
  onVoteError,
}) => {
  const { voteState, starVote, checkVoteStatus } = useVoting(author, permlink);
  const [hoveredStars, setHoveredStars] = useState<number>(0);
  const [isHovering, setIsHovering] = useState(false);

  // Check vote status when component mounts
  React.useEffect(() => {
    checkVoteStatus(author, permlink);
  }, [checkVoteStatus, author, permlink]);

  // Convert vote weight to stars (0-100% to 0-5 stars)
  const currentStars = voteState.hasVoted && voteState.userVote?.weight 
    ? Math.round(Math.abs(voteState.userVote.weight) / 20) 
    : 0;

  const handleStarClick = async (stars: number) => {
    if (!voteState.canVote || voteState.isVoting) return;

    // If clicking the same number of stars as current vote, remove vote
    if (stars === currentStars) {
      const result = await starVote(author, permlink, 0);
      if (result.success) {
        onVoteSuccess?.(result);
      } else {
        onVoteError?.(result.error || 'Vote failed');
      }
      return;
    }

    // Cast new vote
    const result = await starVote(author, permlink, stars);
    if (result.success) {
      onVoteSuccess?.(result);
    } else {
      onVoteError?.(result.error || 'Vote failed');
    }
  };

  const handleStarHover = useCallback((stars: number) => {
    if (!voteState.canVote || voteState.isVoting) return;
    setHoveredStars(stars);
    setIsHovering(true);
  }, [voteState.canVote, voteState.isVoting]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setHoveredStars(0);
  }, []);

  const getStarState = (starIndex: number) => {
    if (voteState.isVoting) return 'loading';
    if (!voteState.canVote) return 'disabled';
    
    const displayStars = isHovering ? hoveredStars : currentStars;
    
    if (starIndex <= displayStars) return 'filled';
    return 'empty';
  };

  const isDisabled = voteState.isVoting || !voteState.canVote;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Star Rating */}
      <div 
        className="flex items-center space-x-1"
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((starNumber) => {
          const starState = getStarState(starNumber);
          
          return (
            <button
              key={starNumber}
              onClick={() => handleStarClick(starNumber)}
              onMouseEnter={() => handleStarHover(starNumber)}
              disabled={isDisabled}
              className={cn(
                "transition-all duration-150 ease-in-out",
                "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
                "rounded-sm p-0.5",
                isDisabled && "cursor-not-allowed opacity-50"
              )}
              title={
                !voteState.canVote
                  ? "Insufficient voting power or not authenticated"
                  : voteState.isVoting
                  ? "Vote in progress..."
                  : `${starNumber} star${starNumber > 1 ? 's' : ''} (${starNumber * 20}% vote weight)`
              }
            >
              {starState === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Star
                  className={cn(
                    "h-4 w-4 transition-all duration-150",
                    starState === 'filled' && [
                      "fill-yellow-400 text-yellow-400",
                      "hover:fill-yellow-500 hover:text-yellow-500"
                    ],
                    starState === 'empty' && [
                      "text-muted-foreground",
                      "hover:text-yellow-300 hover:fill-yellow-300"
                    ],
                    starState === 'disabled' && "text-muted-foreground/50"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Vote Count */}
      <span className="text-xs font-medium text-muted-foreground">
        {voteCount}
      </span>

      {/* Voting Power Indicator */}
      {voteState.canVote && (
        <div className="ml-1 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <span>⚡</span>
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
