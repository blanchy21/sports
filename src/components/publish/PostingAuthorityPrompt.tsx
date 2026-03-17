'use client';

import React, { useState } from 'react';
import { X, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface PostingAuthorityPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted: () => void;
}

export function PostingAuthorityPrompt({
  isOpen,
  onClose,
  onGranted,
}: PostingAuthorityPromptProps) {
  const { hiveUser } = useAuth();
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !hiveUser?.username) return null;

  const handleGrant = async () => {
    setIsGranting(true);
    setError(null);

    try {
      // Fetch current account to get existing posting auths
      const res = await fetch(`/api/hive/account/summary?username=${hiveUser.username}`);
      const data = await res.json();
      if (!data.success || !data.account) {
        throw new Error('Failed to fetch account data');
      }

      const posting = data.account.posting;

      // Check if already has authority
      const alreadyHas = posting.account_auths.some(
        ([auth]: [string, number]) => auth === 'sportsblock'
      );
      if (alreadyHas) {
        onGranted();
        return;
      }

      // Build new account_auths with sportsblock added
      const newAccountAuths = [...posting.account_auths, ['sportsblock', 1]].sort(
        ([a]: [string, number], [b]: [string, number]) => a.localeCompare(b)
      );

      // Request Keychain to sign account_update2 (active authority required)
      const keychain = (
        window as unknown as { hive_keychain?: { requestBroadcast: (...args: unknown[]) => void } }
      ).hive_keychain;
      if (!keychain) {
        throw new Error(
          'Hive Keychain extension not found. Please install it to grant posting authority.'
        );
      }

      const operations = [
        [
          'account_update2',
          {
            account: hiveUser.username,
            json_metadata: '',
            posting_json_metadata: '',
            extensions: [],
            posting: {
              weight_threshold: posting.weight_threshold,
              account_auths: newAccountAuths,
              key_auths: posting.key_auths,
            },
          },
        ],
      ];

      await new Promise<void>((resolve, reject) => {
        keychain.requestBroadcast(
          hiveUser.username,
          operations,
          'active',
          (response: { success: boolean; error?: string; message?: string }) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.message || response.error || 'Keychain signing failed'));
            }
          }
        );
      });

      onGranted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to grant authority';
      setError(msg);
      logger.error('Failed to grant posting authority', 'PostingAuthorityPrompt', err);
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-sb-stadium p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Grant Posting Authority</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-sb-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-lg bg-primary/5 p-4">
          <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div className="text-sm">
            <p className="mb-2 font-medium">Why is this needed?</p>
            <p className="text-muted-foreground">
              To publish scheduled posts on your behalf, Sportsblock needs posting authority on your
              Hive account. This only allows posting — it cannot transfer funds or change your
              account settings.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-lg bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="text-sm text-muted-foreground">
            <p>
              Your Hive Keychain will ask you to approve an <strong>active key</strong> transaction.
              You can revoke this authority at any time from your Hive wallet settings.
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isGranting}>
            Cancel
          </Button>
          <Button onClick={handleGrant} disabled={isGranting}>
            {isGranting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Granting...
              </>
            ) : (
              'Grant Authority'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
