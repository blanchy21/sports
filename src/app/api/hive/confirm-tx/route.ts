import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { waitForTransaction } from '@/lib/hive-workerbee/transaction-confirmation';

export const GET = createApiHandler('/api/hive/confirm-tx', async (request, ctx) => {
  const url = new URL(request.url);
  const txId = url.searchParams.get('txId');

  if (!txId) {
    return apiError('txId query parameter is required', 'VALIDATION_ERROR', 400);
  }

  ctx.log.debug('Confirming transaction', { txId });

  const result = await waitForTransaction(txId, {
    timeoutMs: 15_000, // 15s — keep under Vercel function timeout
    pollIntervalMs: 3_000,
  });

  return apiSuccess({
    confirmed: result.confirmed,
    blockNum: result.blockNum ?? null,
  });
});
