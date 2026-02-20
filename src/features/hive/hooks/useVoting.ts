import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBroadcast } from '@/hooks/useBroadcast';
import { queryKeys } from '@/lib/react-query/queryClient';
import { logger } from '@/lib/logger';
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
  upvote: (author: string, permlink: string) => Promise<VoteResult>;
  downvote: (author: string, permlink: string) => Promise<VoteResult>;
  starVote: (author: string, permlink: string, stars: number) => Promise<VoteResult>;
  commentVote: (author: string, permlink: string, weight: number) => Promise<VoteResult>;
  removeVoteAction: (author: string, permlink: string) => Promise<VoteResult>;
  checkVoteStatus: (author: string, permlink: string) => Promise<void>;
  refreshVoteState: () => Promise<void>;
}

interface VoteStatusData {
  userVote: HiveVote | null;
  eligibility: {
    canVote: boolean;
    votingPower: number;
    reason?: string;
  };
}

async function fetchVoteStatus(
  author: string,
  permlink: string,
  username: string
): Promise<VoteStatusData> {
  const [userVote, eligibility] = await Promise.all([
    checkUserVote(author, permlink, username),
    canUserVote(username),
  ]);
  return { userVote, eligibility };
}

export function useVoting(author: string, permlink: string): UseVotingReturn {
  const { hiveUser, authType } = useAuth();
  const { broadcast } = useBroadcast();
  const queryClient = useQueryClient();
  const username = hiveUser?.username;
  const canBroadcast = authType === 'hive' || authType === 'soft';

  // Use React Query for caching vote status
  const {
    data: voteStatus,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.votes.status(author, permlink, username || ''),
    queryFn: () => fetchVoteStatus(author, permlink, username!),
    enabled: !!username && canBroadcast && !!author && !!permlink,
    staleTime: 5 * 60 * 1000, // 5 minutes - votes don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for casting votes
  const voteMutation = useMutation({
    mutationFn: async (voteData: VoteData) => {
      return await castVote(voteData, broadcast);
    },
    onSuccess: (_result, variables) => {
      // Invalidate the vote status cache for this post
      queryClient.invalidateQueries({
        queryKey: queryKeys.votes.status(variables.author, variables.permlink, variables.voter),
      });
    },
  });

  // Mutation for removing votes
  const removeVoteMutation = useMutation({
    mutationFn: async (data: { voter: string; author: string; permlink: string }) => {
      return await removeVote(data, broadcast);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.votes.status(variables.author, variables.permlink, variables.voter),
      });
    },
  });

  // Derive vote state from cached data
  const voteState: VoteState = {
    isVoting: voteMutation.isPending || removeVoteMutation.isPending,
    userVote: voteStatus?.userVote ?? null,
    hasVoted: !!voteStatus?.userVote,
    voteWeight: voteStatus?.userVote ? Math.abs(voteStatus.userVote.weight) / 100 : 0,
    canVote: voteStatus?.eligibility.canVote ?? false,
    votingPower: voteStatus?.eligibility.votingPower ?? 0,
    error: isError
      ? error instanceof Error
        ? error.message
        : 'Failed to check vote status'
      : null,
  };

  // Cast an upvote
  const upvote = useCallback(async (): Promise<VoteResult> => {
    if (!username || !canBroadcast) {
      return { success: false, error: 'Authentication required for voting' };
    }

    try {
      const optimalWeight = await calculateOptimalVoteWeight(username);
      const voteData: VoteData = {
        voter: username,
        author,
        permlink,
        weight: optimalWeight,
      };

      const result = await voteMutation.mutateAsync(voteData);
      return result;
    } catch (err) {
      logger.error('Error casting upvote', 'useVoting', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';
      return { success: false, error: errorMessage };
    }
  }, [author, permlink, username, canBroadcast, voteMutation]);

  // Cast a downvote (negative weight)
  const downvote = useCallback(async (): Promise<VoteResult> => {
    if (!username || !canBroadcast) {
      return { success: false, error: 'Authentication required for voting' };
    }

    try {
      const optimalWeight = await calculateOptimalVoteWeight(username);
      const voteData: VoteData = {
        voter: username,
        author,
        permlink,
        weight: -optimalWeight,
      };

      const result = await voteMutation.mutateAsync(voteData);
      return result;
    } catch (err) {
      logger.error('Error casting downvote', 'useVoting', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';
      return { success: false, error: errorMessage };
    }
  }, [author, permlink, username, canBroadcast, voteMutation]);

  // Cast a star-based vote (1-5 stars = 20%-100% weight)
  const starVote = useCallback(
    async (voteAuthor: string, votePermlink: string, stars: number): Promise<VoteResult> => {
      if (!username || !canBroadcast) {
        return { success: false, error: 'Authentication required for voting' };
      }

      if (stars < 0 || stars > 5) {
        return { success: false, error: 'Stars must be between 0 and 5' };
      }

      try {
        const voteWeightPercentage = stars * 20;
        const voteData: VoteData = {
          voter: username,
          author: voteAuthor,
          permlink: votePermlink,
          weight: voteWeightPercentage,
        };

        const result = await voteMutation.mutateAsync(voteData);

        // Optimistically update the cache with the new vote
        if (result.success) {
          const percentBasisPoints = voteWeightPercentage * 100;

          // Cancel any in-flight refetch from mutation's onSuccess invalidation
          // so it can't overwrite our optimistic update before the blockchain propagates
          await queryClient.cancelQueries({
            queryKey: queryKeys.votes.status(voteAuthor, votePermlink, username),
          });

          queryClient.setQueryData<VoteStatusData>(
            queryKeys.votes.status(voteAuthor, votePermlink, username),
            (old) => ({
              eligibility: old?.eligibility ?? { canVote: true, votingPower: 100 },
              userVote:
                stars > 0
                  ? {
                      voter: username,
                      weight: voteWeightPercentage * 100,
                      rshares: '0',
                      percent: percentBasisPoints,
                      reputation: '',
                      time: new Date().toISOString(),
                    }
                  : null,
            })
          );
        }

        return result;
      } catch (err) {
        logger.error('Error casting star vote', 'useVoting', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';
        return { success: false, error: errorMessage };
      }
    },
    [username, canBroadcast, voteMutation, queryClient]
  );

  // Cast a comment vote with fixed weight
  const commentVote = useCallback(
    async (voteAuthor: string, votePermlink: string, weight: number): Promise<VoteResult> => {
      if (!username || !canBroadcast) {
        return { success: false, error: 'Authentication required for voting' };
      }

      if (weight < 0 || weight > 100) {
        return { success: false, error: 'Vote weight must be between 0 and 100' };
      }

      try {
        const voteData: VoteData = {
          voter: username,
          author: voteAuthor,
          permlink: votePermlink,
          weight,
        };

        const result = await voteMutation.mutateAsync(voteData);
        return result;
      } catch (err) {
        logger.error('Error casting comment vote', 'useVoting', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';
        return { success: false, error: errorMessage };
      }
    },
    [username, canBroadcast, voteMutation]
  );

  // Remove a vote (set weight to 0)
  const removeVoteAction = useCallback(async (): Promise<VoteResult> => {
    if (!username || !canBroadcast) {
      return { success: false, error: 'Authentication required for voting' };
    }

    try {
      const result = await removeVoteMutation.mutateAsync({
        voter: username,
        author,
        permlink,
      });
      return result;
    } catch (err) {
      logger.error('Error removing vote', 'useVoting', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove vote';
      return { success: false, error: errorMessage };
    }
  }, [author, permlink, username, canBroadcast, removeVoteMutation]);

  // Legacy checkVoteStatus - now triggers refetch
  const checkVoteStatus = useCallback(async () => {
    if (!username || !canBroadcast) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.votes.status(author, permlink, username),
    });
  }, [author, permlink, username, canBroadcast, queryClient]);

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
