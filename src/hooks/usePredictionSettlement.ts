import { useMutation, useQueryClient } from '@tanstack/react-query';
import { predictionKeys } from './usePredictions';

/**
 * Propose settlement for a prediction (requires second admin approval).
 */
export function useSettlePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      predictionId,
      winningOutcomeId,
    }: {
      predictionId: string;
      winningOutcomeId: string;
    }) => {
      const response = await fetch(`/api/predictions/${predictionId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ winningOutcomeId }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to propose settlement');
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
    },
  });
}

/**
 * Propose voiding a prediction (requires second admin approval).
 */
export function useVoidPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ predictionId, reason }: { predictionId: string; reason: string }) => {
      const response = await fetch(`/api/predictions/${predictionId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to propose void');
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
    },
  });
}

/**
 * Approve a pending settlement/void proposal.
 * Admin-only, must be different from the proposer.
 */
export function useApprovePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ predictionId }: { predictionId: string }) => {
      const response = await fetch(`/api/predictions/${predictionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to approve proposal');
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: predictionKeys.leaderboard({}) });
    },
  });
}

/**
 * Reject a pending settlement/void proposal. Returns prediction to LOCKED.
 */
export function useRejectPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ predictionId }: { predictionId: string }) => {
      const response = await fetch(`/api/predictions/${predictionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to reject proposal');
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
    },
  });
}
