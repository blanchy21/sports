import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBroadcast } from '@/hooks/useBroadcast';
import { predictionKeys } from './usePredictions';

interface PlaceStakeParams {
  predictionId: string;
  outcomeId: string;
  amount: number;
}

const CONFIRM_MAX_RETRIES = 3;
const CONFIRM_BASE_DELAY_MS = 2000;

/** Retry the confirm call with exponential backoff — tokens are already on-chain at this point */
async function confirmStakeWithRetry(
  predictionId: string,
  stakeToken: string,
  txId: string
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= CONFIRM_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`/api/predictions/${predictionId}/stake/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stakeToken, txId }),
      });
      const data = await res.json();

      if (data.success) return data.data;

      const errMsg = typeof data.error === 'string' ? data.error : data.error?.message;

      // "already confirmed" means a previous retry succeeded — treat as success
      if (errMsg?.includes('already confirmed')) return data.data ?? {};

      lastError = new Error(errMsg || 'Failed to confirm stake');

      // Don't retry client-side validation errors (bad token, expired, etc.)
      if (res.status === 400 || res.status === 401 || res.status === 403) throw lastError;
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        // Network error — retryable
        lastError = err;
      } else if (lastError !== err) {
        throw err; // Non-retryable error thrown above
      }
    }

    if (attempt < CONFIRM_MAX_RETRIES) {
      const delay = CONFIRM_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error('Failed to confirm stake after retries');
}

/**
 * Two-step stake flow:
 * 1. POST /api/predictions/:id/stake → get operation + stakeToken
 * 2. Sign operation via wallet (active key)
 * 3. POST /api/predictions/:id/stake/confirm → finalize (with retry)
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
        const buildErr =
          typeof buildData.error === 'string' ? buildData.error : buildData.error?.message;
        throw new Error(buildErr || 'Failed to build stake');
      }

      const { operation, stakeToken } = buildData.data;

      // Step 2: Sign via wallet (active key required for Hive-Engine transfers)
      const broadcastResult = await broadcast([['custom_json', operation]], 'active');
      if (!broadcastResult.success) {
        throw new Error(broadcastResult.error);
      }

      // Step 3: Confirm stake (with retry — tokens are already on-chain)
      return confirmStakeWithRetry(predictionId, stakeToken, broadcastResult.transactionId!);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: predictionKeys.detail(variables.predictionId) });
      queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
      // Invalidate MEDALS balance since user spent tokens on the stake
      queryClient.invalidateQueries({ queryKey: ['medals'] });
    },
  });
}
