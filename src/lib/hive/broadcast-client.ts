'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletProvider';
import type { WalletContextValue } from '@/lib/wallet/types';
import type { AuthType } from '@/types/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { HiveOperation, KeyType } from '@/types/hive-operations';
export type { HiveOperation, KeyType };

export type BroadcastResult =
  | { success: true; transactionId: string }
  | { success: false; error: string };

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
    wallet?: WalletContextValue;
    keyType?: KeyType;
  }
): Promise<BroadcastResult> {
  const { authType, wallet, keyType = 'posting' } = options;

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

  // Wallet path → client-side signing
  if (authType === 'hive') {
    if (!wallet || !wallet.currentUser) {
      return {
        success: false,
        error: 'Wallet is not connected. Please refresh and try again.',
      };
    }

    return wallet.signAndBroadcast(operations, keyType);
  }

  // Guest or unknown auth type
  return { success: false, error: 'Authentication required to broadcast operations' };
}

// ---------------------------------------------------------------------------
// useBroadcast — React hook wrapping broadcastOperations
// ---------------------------------------------------------------------------

export function useBroadcast() {
  const { authType } = useAuth();
  const wallet = useWallet();

  const broadcast = useCallback(
    (operations: HiveOperation[], keyType?: KeyType): Promise<BroadcastResult> => {
      return broadcastOperations(operations, { authType, wallet, keyType });
    },
    [authType, wallet]
  );

  const isCustodial = authType === 'soft';

  return { broadcast, isCustodial };
}
