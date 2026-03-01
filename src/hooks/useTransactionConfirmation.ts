'use client';

import { useCallback } from 'react';
import { useToast, toast } from '@/components/core/Toast';

/**
 * Fire-and-forget hook that polls for Hive transaction confirmation
 * and shows a toast when the transaction is included in a block.
 */
export function useTransactionConfirmation() {
  const { addToast } = useToast();

  const confirm = useCallback(
    (txId: string) => {
      if (!txId || txId === 'unknown') return;

      fetch(`/api/hive/confirm-tx?txId=${encodeURIComponent(txId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.confirmed && data.blockNum) {
            addToast(
              toast.info(
                'Confirmed',
                `Transaction included in block #${Number(data.blockNum).toLocaleString()}`
              )
            );
          }
          // If not confirmed within timeout, stay silent — the tx was already
          // broadcast successfully and will almost certainly be included.
        })
        .catch(() => {
          // Silent — the broadcast already succeeded; confirmation is best-effort.
        });
    },
    [addToast]
  );

  return { confirm };
}
