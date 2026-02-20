'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAioha } from '@/contexts/AiohaProvider';
import type { AiohaInstance } from '@/lib/aioha/types';
import type { AuthType } from '@/types/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HiveOperation = [string, Record<string, any>];
export type KeyType = 'posting' | 'active';

export interface BroadcastResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export type BroadcastFn = (
  operations: HiveOperation[],
  keyType?: KeyType
) => Promise<BroadcastResult>;

// Relay response envelope (matches apiSuccess/apiError from /api/hive/sign)
interface RelaySuccessResponse {
  success: true;
  data: { transactionId: string };
}

interface RelayErrorResponse {
  success: false;
  error: { message: string; code: string };
}

type RelayResponse = RelaySuccessResponse | RelayErrorResponse;

// ---------------------------------------------------------------------------
// relayBroadcast — low-level POST to /api/hive/sign for custodial users
// ---------------------------------------------------------------------------

async function relayBroadcast(operations: HiveOperation[]): Promise<BroadcastResult> {
  const response = await fetch('/api/hive/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ operations }),
  });

  const body: RelayResponse = await response.json();

  if (!response.ok || !body.success) {
    const errorMsg =
      !body.success && 'error' in body && typeof body.error === 'object'
        ? body.error.message
        : `Relay request failed (${response.status})`;
    return { success: false, error: errorMsg };
  }

  return { success: true, transactionId: body.data.transactionId };
}

// ---------------------------------------------------------------------------
// broadcastOperations — high-level router
// ---------------------------------------------------------------------------

export async function broadcastOperations(
  operations: HiveOperation[],
  options: {
    authType: AuthType;
    aioha?: unknown;
    keyType?: KeyType;
  }
): Promise<BroadcastResult> {
  const { authType, aioha, keyType = 'posting' } = options;

  // Custodial path → server-side signing relay (posting key only)
  if (authType === 'soft') {
    if (keyType === 'active') {
      return {
        success: false,
        error: 'Active key operations are not supported for custodial accounts',
      };
    }
    return relayBroadcast(operations);
  }

  // Wallet path → Aioha client-side signing
  if (authType === 'hive') {
    const instance = aioha as AiohaInstance | undefined;
    if (!instance?.signAndBroadcastTx) {
      return {
        success: false,
        error: 'Aioha wallet is not available. Please refresh and try again.',
      };
    }

    try {
      const result = await instance.signAndBroadcastTx(operations, keyType);
      const transactionId = (result as { id?: string })?.id || 'unknown';
      return { success: true, transactionId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Guest or unknown auth type
  return { success: false, error: 'Authentication required to broadcast operations' };
}

// ---------------------------------------------------------------------------
// useBroadcast — React hook wrapping broadcastOperations
// ---------------------------------------------------------------------------

export function useBroadcast() {
  const { authType } = useAuth();
  const { aioha } = useAioha();

  const broadcast = useCallback(
    (operations: HiveOperation[], keyType?: KeyType): Promise<BroadcastResult> => {
      return broadcastOperations(operations, { authType, aioha, keyType });
    },
    [authType, aioha]
  );

  const isCustodial = authType === 'soft';

  return { broadcast, isCustodial };
}
