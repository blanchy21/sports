import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBroadcast } from '@/hooks/useBroadcast';
import { predictionKeys } from './usePredictions';

interface PlaceStakeParams {
  predictionId: string;
  outcomeId: string;
  amount: number;
}

/**
 * Two-step stake flow:
 * 1. POST /api/predictions/:id/stake → get operation + stakeToken
 * 2. Sign operation via wallet (active key)
 * 3. POST /api/predictions/:id/stake/confirm → finalize
 */
export function usePlaceStake() {
  const { broadcast } = useBroadcast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ predictionId, outcomeId, amount }: PlaceStakeParams) => {
      // Step 1: Build stake operation
      const buildRes = await fetch(`/api/predictions/${predictionId}/stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ outcomeId, amount }),
      });
      const buildData = await buildRes.json();
      if (!buildData.success) {
        throw new Error(buildData.error?.message || 'Failed to build stake');
      }

      const { operation, stakeToken } = buildData.data;

      // Step 2: Sign via wallet (active key required for Hive-Engine transfers)
      const broadcastResult = await broadcast([['custom_json', operation]], 'active');
      if (!broadcastResult.success) {
        throw new Error(broadcastResult.error);
      }

      // Step 3: Confirm stake
      const confirmRes = await fetch(`/api/predictions/${predictionId}/stake/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stakeToken, txId: broadcastResult.transactionId }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmData.success) {
        throw new Error(confirmData.error?.message || 'Failed to confirm stake');
      }

      return confirmData.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
    },
  });
}
