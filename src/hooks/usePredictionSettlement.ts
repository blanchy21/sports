import { useMutation, useQueryClient } from '@tanstack/react-query';
import { predictionKeys } from './usePredictions';

/**
 * Settle a prediction by selecting the winning outcome.
 * Only available to the prediction creator or admin accounts.
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
        throw new Error(data.error?.message || 'Failed to settle prediction');
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: predictionKeys.leaderboard({}),
      });
    },
  });
}

/**
 * Void a prediction with a reason.
 * Only available to the prediction creator or admin accounts.
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
        throw new Error(data.error?.message || 'Failed to void prediction');
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
    },
  });
}
