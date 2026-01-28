import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  castVote,
  removeVote,
  checkUserVote,
  canUserVote,
  calculateOptimalVoteWeight,
  VoteData,
  VoteResult,
} from '@/lib/hive-workerbee/voting';
import { HiveVote } from '@/lib/shared/types';

export interface VoteState {
  isVoting: boolean;
  userVote: HiveVote | null;
  hasVoted: boolean;
  voteWeight: number;
  canVote: boolean;
  votingPower: number;
  error: string | null;
}

export interface UseVotingReturn {
  voteState: VoteState;
  /** Upvote the post/comment this hook was initialized with */
  upvote: () => Promise<VoteResult>;
  /** Downvote the post/comment this hook was initialized with */
  downvote: () => Promise<VoteResult>;
  /** Cast a star-based vote (1-5 stars = 20%-100% weight) */
  starVote: (author: string, permlink: string, stars: number) => Promise<VoteResult>;
  /** Cast a comment vote with specific weight (0-100) */
  commentVote: (author: string, permlink: string, weight: number) => Promise<VoteResult>;
  /** Remove the vote from the post/comment this hook was initialized with */
  removeVoteAction: () => Promise<VoteResult>;
  /** Check the current user's vote status on the initialized post/comment */
  checkVoteStatus: () => Promise<void>;
  refreshVoteState: () => Promise<void>;
}

export function useVoting(author: string, permlink: string): UseVotingReturn {
  const { hiveUser, authType } = useAuth();
  const [voteState, setVoteState] = useState<VoteState>({
    isVoting: false,
    userVote: null,
    hasVoted: false,
    voteWeight: 0,
    canVote: false,
    votingPower: 0,
    error: null,
  });

  // Check if user can vote and get their current vote status
  const checkVoteStatus = useCallback(async () => {
    if (!hiveUser?.username || authType !== 'hive') {
      setVoteState((prev) => ({
        ...prev,
        canVote: false,
        votingPower: 0,
        userVote: null,
        hasVoted: false,
        voteWeight: 0,
      }));
      return;
    }

    try {
      setVoteState((prev) => ({ ...prev, error: null }));

      // Check voting eligibility
      const eligibility = await canUserVote(hiveUser.username);

      // Check if user has already voted
      const userVote = await checkUserVote(author, permlink, hiveUser.username);

      setVoteState((prev) => ({
        ...prev,
        canVote: eligibility.canVote,
        votingPower: eligibility.votingPower,
        userVote,
        hasVoted: !!userVote,
        voteWeight: userVote ? Math.abs(userVote.weight) / 100 : 0, // Convert from 0-10000 to 0-100
      }));
    } catch (error) {
      console.error('Error checking vote status:', error);
      setVoteState((prev) => ({
        ...prev,
        error: 'Failed to check vote status',
      }));
    }
  }, [author, permlink, hiveUser?.username, authType]);

  // Cast an upvote
  const upvote = useCallback(async (): Promise<VoteResult> => {
    if (!hiveUser?.username || authType !== 'hive') {
      return {
        success: false,
        error: 'Authentication required for voting',
      };
    }

    setVoteState((prev) => ({ ...prev, isVoting: true, error: null }));

    try {
      // Calculate optimal vote weight
      const optimalWeight = await calculateOptimalVoteWeight(hiveUser.username);

      const voteData: VoteData = {
        voter: hiveUser.username,
        author,
        permlink,
        weight: optimalWeight,
      };

      const result = await castVote(voteData);

      if (result.success) {
        // Refresh vote state after successful vote
        await checkVoteStatus();
      }

      setVoteState((prev) => ({ ...prev, isVoting: false }));
      return result;
    } catch (error) {
      console.error('Error casting upvote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
      setVoteState((prev) => ({ ...prev, isVoting: false, error: errorMessage }));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [author, permlink, hiveUser, authType, checkVoteStatus]);

  // Cast a downvote (negative weight)
  const downvote = useCallback(async (): Promise<VoteResult> => {
    if (!hiveUser?.username || authType !== 'hive') {
      return {
        success: false,
        error: 'Authentication required for voting',
      };
    }

    setVoteState((prev) => ({ ...prev, isVoting: true, error: null }));

    try {
      // Calculate optimal vote weight but use negative value for downvote
      const optimalWeight = await calculateOptimalVoteWeight(hiveUser.username);

      const voteData: VoteData = {
        voter: hiveUser.username,
        author,
        permlink,
        weight: -optimalWeight, // Negative weight for downvote
      };

      const result = await castVote(voteData);

      if (result.success) {
        // Refresh vote state after successful vote
        await checkVoteStatus();
      }

      setVoteState((prev) => ({ ...prev, isVoting: false }));
      return result;
    } catch (error) {
      console.error('Error casting downvote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
      setVoteState((prev) => ({ ...prev, isVoting: false, error: errorMessage }));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [author, permlink, hiveUser, authType, checkVoteStatus]);

  // Cast a star-based vote (1-5 stars = 20%-100% weight)
  const starVote = useCallback(
    async (author: string, permlink: string, stars: number): Promise<VoteResult> => {
      if (!hiveUser?.username || authType !== 'hive') {
        return {
          success: false,
          error: 'Authentication required for voting',
        };
      }

      // Validate stars input (0-5)
      if (stars < 0 || stars > 5) {
        return {
          success: false,
          error: 'Stars must be between 0 and 5',
        };
      }

      setVoteState((prev) => ({ ...prev, isVoting: true, error: null }));

      try {
        // Convert stars to vote weight percentage (1 star = 20%, 5 stars = 100%)
        const voteWeightPercentage = stars * 20;

        const voteData: VoteData = {
          voter: hiveUser.username,
          author,
          permlink,
          weight: voteWeightPercentage,
        };

        const result = await castVote(voteData);

        if (result.success) {
          // Optimistically update vote state immediately so stars stay filled
          // The blockchain may not reflect the vote yet if we query right away
          const percentBasisPoints = voteWeightPercentage * 100; // Convert to 0-10000 scale
          setVoteState((prev) => ({
            ...prev,
            isVoting: false,
            userVote:
              stars > 0
                ? {
                    voter: hiveUser.username,
                    weight: 0,
                    rshares: '0',
                    percent: percentBasisPoints,
                    reputation: '',
                    time: new Date().toISOString(),
                  }
                : null,
            hasVoted: stars > 0,
            voteWeight: voteWeightPercentage,
          }));
        } else {
          setVoteState((prev) => ({ ...prev, isVoting: false }));
        }

        return result;
      } catch (error) {
        console.error('Error casting star vote:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
        setVoteState((prev) => ({ ...prev, isVoting: false, error: errorMessage }));
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [hiveUser, authType]
  );

  // Cast a comment vote with fixed weight (typically 20% for comments)
  const commentVote = useCallback(
    async (author: string, permlink: string, weight: number): Promise<VoteResult> => {
      if (!hiveUser?.username || authType !== 'hive') {
        return {
          success: false,
          error: 'Authentication required for voting',
        };
      }

      // Validate weight (0-100)
      if (weight < 0 || weight > 100) {
        return {
          success: false,
          error: 'Vote weight must be between 0 and 100',
        };
      }

      setVoteState((prev) => ({ ...prev, isVoting: true, error: null }));

      try {
        const voteData: VoteData = {
          voter: hiveUser.username,
          author,
          permlink,
          weight,
        };

        const result = await castVote(voteData);

        if (result.success) {
          // Refresh vote state after successful vote
          await checkVoteStatus();
        }

        setVoteState((prev) => ({ ...prev, isVoting: false }));
        return result;
      } catch (error) {
        console.error('Error casting comment vote:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
        setVoteState((prev) => ({ ...prev, isVoting: false, error: errorMessage }));
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [hiveUser, authType, checkVoteStatus]
  );

  // Remove a vote (set weight to 0)
  const removeVoteAction = useCallback(async (): Promise<VoteResult> => {
    if (!hiveUser?.username || authType !== 'hive') {
      return {
        success: false,
        error: 'Authentication required for voting',
      };
    }

    setVoteState((prev) => ({ ...prev, isVoting: true, error: null }));

    try {
      const voteData = {
        voter: hiveUser.username,
        author,
        permlink,
      };

      const result = await removeVote(voteData);

      if (result.success) {
        // Refresh vote state after successful vote removal
        await checkVoteStatus();
      }

      setVoteState((prev) => ({ ...prev, isVoting: false }));
      return result;
    } catch (error) {
      console.error('Error removing vote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove vote';
      setVoteState((prev) => ({ ...prev, isVoting: false, error: errorMessage }));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [author, permlink, hiveUser, authType, checkVoteStatus]);

  // Refresh vote state
  const refreshVoteState = useCallback(async () => {
    await checkVoteStatus();
  }, [checkVoteStatus]);

  return {
    voteState,
    upvote,
    downvote,
    starVote,
    commentVote,
    removeVoteAction,
    checkVoteStatus,
    refreshVoteState,
  };
}
