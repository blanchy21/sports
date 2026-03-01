'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Gift, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { useBroadcast } from '@/lib/hive/broadcast-client';
import type { HiveOperation } from '@/types/hive-operations';

interface RewardAmounts {
  hive: string; // e.g. "1.234 HIVE"
  hbd: string; // e.g. "0.567 HBD"
  vesting: string; // e.g. "123.456789 VESTS"
  hp?: number; // HP equivalent of vesting
}

interface ClaimRewardsBannerProps {
  account: string;
  showBalances: boolean;
  onClaimed: () => void;
}

function parseAmount(assetString: string): number {
  return parseFloat(assetString.split(' ')[0] || '0');
}

function formatRewardAmount(amount: number, symbol: string): string {
  return `${amount.toFixed(3)} ${symbol}`;
}

export function ClaimRewardsBanner({ account, showBalances, onClaimed }: ClaimRewardsBannerProps) {
  const { broadcast } = useBroadcast();
  const [rewards, setRewards] = useState<RewardAmounts | null>(null);
  const [operation, setOperation] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'claiming' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const fetchRewards = useCallback(async () => {
    if (!account) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/hive/claim-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ account }),
      });

      if (!res.ok) {
        // 400 = no pending rewards — not an error, just nothing to show
        setRewards(null);
        setStatus('idle');
        return;
      }

      const data = await res.json();
      setRewards(data.rewards);
      setOperation(data.operation);
      setStatus('idle');
    } catch {
      setRewards(null);
      setStatus('idle');
    }
  }, [account]);

  useEffect(() => {
    void fetchRewards();
  }, [fetchRewards]);

  const handleClaim = async () => {
    if (!operation) return;
    setStatus('claiming');
    setErrorMessage('');

    try {
      const ops: HiveOperation[] = [['claim_reward_balance', operation]];
      const result = await broadcast(ops, 'posting');

      if (result.success) {
        setStatus('success');
        // Brief success message, then hide and refresh
        setTimeout(() => {
          setRewards(null);
          setStatus('idle');
          onClaimed();
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error);
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to claim rewards');
    }
  };

  // Nothing to show
  if (!rewards || status === 'loading') return null;

  // Build display items for non-zero rewards
  const items: string[] = [];
  const hiveAmount = parseAmount(rewards.hive);
  const hbdAmount = parseAmount(rewards.hbd);
  const vestingAmount = parseAmount(rewards.vesting);

  if (hiveAmount > 0) items.push(formatRewardAmount(hiveAmount, 'HIVE'));
  if (hbdAmount > 0) items.push(formatRewardAmount(hbdAmount, 'HBD'));
  if (vestingAmount > 0) {
    // Display HP if the API provided the conversion, otherwise show VESTS
    if (rewards.hp && rewards.hp > 0) {
      items.push(formatRewardAmount(rewards.hp, 'HP'));
    } else {
      items.push(formatRewardAmount(vestingAmount, 'VESTS'));
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Gift className="h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-medium">Unclaimed Rewards</p>
            <p className="text-sm text-muted-foreground">
              {showBalances ? items.join(' + ') : '••••••'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'success' && (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Claimed!
            </span>
          )}

          {status === 'error' && (
            <span className="text-sm text-destructive">{errorMessage || 'Claim failed'}</span>
          )}

          {status !== 'success' && (
            <Button
              size="sm"
              onClick={handleClaim}
              disabled={status === 'claiming'}
              className="shrink-0"
            >
              {status === 'claiming' ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim Rewards'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
