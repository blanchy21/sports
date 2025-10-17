import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  castVote, 
  removeVote, 
  checkUserVote, 
  canUserVote,
  calculateOptimalVoteWeight,
  VoteData,
  VoteResult 
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
  upvote: (author: string, permlink: string) => Promise<VoteResult>;
  downvote: (author: string, permlink: string) => Promise<VoteResult>;
  removeVoteAction: (author: string, permlink: string) => Promise<VoteResult>;
  checkVoteStatus: (author: string, permlink: string) => Promise<void>;
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
      setVoteState(prev => ({
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
      setVoteState(prev => ({ ...prev, error: null }));

      // Check voting eligibility
      const eligibility = await canUserVote(hiveUser.username);
      
      // Check if user has already voted
      const userVote = await checkUserVote(author, permlink, hiveUser.username);
      
      setVoteState(prev => ({
        ...prev,
        canVote: eligibility.canVote,
        votingPower: eligibility.votingPower,
        userVote,
        hasVoted: !!userVote,
        voteWeight: userVote ? Math.abs(userVote.weight) / 100 : 0, // Convert from 0-10000 to 0-100
      }));
    } catch (error) {
      console.error('Error checking vote status:', error);
      setVoteState(prev => ({
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

    setVoteState(prev => ({ ...prev, isVoting: true, error: null }));

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
      
      setVoteState(prev => ({ ...prev, isVoting: false }));
      return result;
    } catch (error) {
      console.error('Error casting upvote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
      setVoteState(prev => ({ ...prev, isVoting: false, error: errorMessage }));
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

    setVoteState(prev => ({ ...prev, isVoting: true, error: null }));

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
      
      setVoteState(prev => ({ ...prev, isVoting: false }));
      return result;
    } catch (error) {
      console.error('Error casting downvote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
      setVoteState(prev => ({ ...prev, isVoting: false, error: errorMessage }));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [author, permlink, hiveUser, authType, checkVoteStatus]);

  // Remove a vote (set weight to 0)
  const removeVoteAction = useCallback(async (): Promise<VoteResult> => {
    if (!hiveUser?.username || authType !== 'hive') {
      return {
        success: false,
        error: 'Authentication required for voting',
      };
    }

    setVoteState(prev => ({ ...prev, isVoting: true, error: null }));

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
      
      setVoteState(prev => ({ ...prev, isVoting: false }));
      return result;
    } catch (error) {
      console.error('Error removing vote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove vote';
      setVoteState(prev => ({ ...prev, isVoting: false, error: errorMessage }));
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
    removeVoteAction,
    checkVoteStatus,
    refreshVoteState,
  };
}
