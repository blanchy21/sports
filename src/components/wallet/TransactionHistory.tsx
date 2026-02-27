'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Activity,
  RefreshCw,
  Clock,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/core/Button';
import { logger } from '@/lib/logger';

interface TransactionOperation {
  id: number;
  timestamp: string;
  type: string;
  operation: Record<string, unknown>;
  blockNumber: number;
  transactionId: string;
  description: string;
}

const TRANSACTION_PAGE_SIZE = 20;

function getTransactionIcon(type: string) {
  switch (type) {
    case 'transfer':
      return <ArrowRightLeft className="h-4 w-4" />;
    case 'vote':
      return <TrendingUp className="h-4 w-4" />;
    case 'comment':
      return <Activity className="h-4 w-4" />;
    case 'account_update':
      return <Wallet className="h-4 w-4" />;
    case 'account_create':
    case 'power_up':
      return <TrendingUp className="h-4 w-4" />;
    case 'power_down':
      return <TrendingDown className="h-4 w-4" />;
    case 'delegate_vesting_shares':
      return <ArrowRightLeft className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function formatTransactionTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface TransactionHistoryProps {
  username: string;
}

export function TransactionHistory({ username }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<TransactionOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const nextStartRef = useRef<number | undefined>(undefined);

  const fetchTransactions = useCallback(
    async (start?: number) => {
      const appending = start !== undefined;
      if (appending) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          username,
          limit: String(TRANSACTION_PAGE_SIZE),
        });
        if (start !== undefined) params.append('start', String(start));

        const response = await fetch(`/api/hive/account/history?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          const ops = data.operations || [];
          setTransactions((prev) => (appending ? [...prev, ...ops] : ops));
          setHasMore(data.hasMore ?? false);
          nextStartRef.current = data.nextStart;
        } else {
          setError(data.error || 'Failed to fetch transactions');
        }
      } catch (err) {
        logger.error('Error fetching transactions', 'TransactionHistory', err);
        setError('Failed to fetch transactions');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [username]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center text-lg font-semibold">
          <Activity className="mr-2 h-5 w-5" />
          Recent Monetary Transactions
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchTransactions()}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-lg font-medium">Loading transactions...</p>
            <p className="text-sm">Fetching your transaction history</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500">
            <Activity className="mx-auto mb-4 h-8 w-8 opacity-50" />
            <p className="text-lg font-medium">Error loading transactions</p>
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransactions()}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Activity className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <p className="text-lg font-medium">No monetary transactions yet</p>
            <p className="text-sm">Your monetary transaction history will appear here</p>
            <p className="mt-2 text-xs opacity-75">
              Shows transfers, rewards, payouts, and other monetary activities
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border bg-muted/50 p-4 transition-colors hover:bg-muted/70"
              >
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatTransactionTime(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Block #{transaction.blockNumber}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {transaction.transactionId.slice(0, 8)}...
                  </p>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactions(nextStartRef.current)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Transactions'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
