'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/core/Card';
import { Button } from '@/components/core/Button';
import { useMedalsHistory, type MedalsTransaction } from '@/lib/react-query/queries/useMedals';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  History,
  Filter,
} from 'lucide-react';

interface TransactionHistoryProps {
  /** Hive account username */
  account: string;
  /** Number of transactions per page */
  pageSize?: number;
  /** Show filter dropdown */
  showFilter?: boolean;
  /** Additional className */
  className?: string;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Transaction type configuration
 */
const TX_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: typeof ArrowUpRight;
    color: string;
    bgColor: string;
  }
> = {
  transfer: {
    label: 'Transfer',
    icon: ArrowUpRight,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  transfer_in: {
    label: 'Received',
    icon: ArrowDownLeft,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  stake: {
    label: 'Stake',
    icon: Lock,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  unstake_start: {
    label: 'Unstake',
    icon: Unlock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  unstake_complete: {
    label: 'Unstake Complete',
    icon: Unlock,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  cancel_unstake: {
    label: 'Cancel Unstake',
    icon: RefreshCw,
    color: 'text-foreground/70',
    bgColor: 'bg-muted/50',
  },
  delegate: {
    label: 'Delegate',
    icon: ArrowUpRight,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  undelegate: {
    label: 'Undelegate',
    icon: ArrowDownLeft,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

/**
 * Format a token amount to 3 decimal places
 */
function formatAmount(amount: string | number | undefined): string {
  if (!amount) return '0.000';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.000';
  return num.toFixed(3);
}

/**
 * Format a timestamp to relative or absolute time
 */
function formatTime(timestamp: string): { relative: string; absolute: string } {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Relative time
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let relative: string;
  if (days > 30) {
    relative = date.toLocaleDateString();
  } else if (days > 0) {
    relative = `${days}d ago`;
  } else if (hours > 0) {
    relative = `${hours}h ago`;
  } else if (minutes > 0) {
    relative = `${minutes}m ago`;
  } else {
    relative = 'Just now';
  }

  // Absolute time
  const absolute = date.toLocaleString();

  return { relative, absolute };
}

/**
 * Get transaction direction and type for display
 */
function getTransactionDisplay(
  tx: MedalsTransaction,
  currentAccount: string
): { type: string; isIncoming: boolean } {
  const type = tx.type.toLowerCase();

  // Handle transfers
  if (type === 'transfer') {
    const isIncoming = tx.to.toLowerCase() === currentAccount.toLowerCase();
    return { type: isIncoming ? 'transfer_in' : 'transfer', isIncoming };
  }

  // Handle stake operations
  if (type.includes('stake')) {
    if (type.includes('cancel')) return { type: 'cancel_unstake', isIncoming: false };
    if (type.includes('unstake')) {
      if (type.includes('complete')) return { type: 'unstake_complete', isIncoming: true };
      return { type: 'unstake_start', isIncoming: false };
    }
    return { type: 'stake', isIncoming: false };
  }

  // Handle delegations
  if (type.includes('delegate')) {
    const isIncoming = type.includes('undelegate')
      ? tx.from.toLowerCase() !== currentAccount.toLowerCase()
      : tx.to.toLowerCase() === currentAccount.toLowerCase();
    return { type: type.includes('undelegate') ? 'undelegate' : 'delegate', isIncoming };
  }

  // Default
  return { type, isIncoming: false };
}

/**
 * Single transaction row component
 */
interface TransactionRowProps {
  transaction: MedalsTransaction;
  currentAccount: string;
  compact?: boolean;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  currentAccount,
  compact,
}) => {
  const { type, isIncoming } = getTransactionDisplay(transaction, currentAccount);
  const config = TX_TYPE_CONFIG[type] || TX_TYPE_CONFIG.transfer;
  const Icon = config.icon;
  const time = formatTime(transaction.timestamp);

  // Determine the counterparty
  const counterparty =
    transaction.from.toLowerCase() === currentAccount.toLowerCase()
      ? transaction.to
      : transaction.from;

  if (compact) {
    return (
      <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-full p-1.5', config.bgColor)}>
            <Icon className={cn('h-3 w-3', config.color)} />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">{config.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">@{counterparty}</span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn('text-sm font-semibold', isIncoming ? 'text-success' : 'text-foreground')}
          >
            {isIncoming ? '+' : '-'}
            {formatAmount(transaction.quantity)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
      {/* Icon */}
      <div className={cn('rounded-full p-2.5', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{config.label}</span>
          <span className="text-xs text-muted-foreground/70">to/from</span>
          <span className="truncate text-sm text-foreground/70">@{counterparty}</span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span title={time.absolute}>{time.relative}</span>
          </span>
          {transaction.memo && (
            <span
              className="max-w-[200px] truncate text-xs text-muted-foreground/70"
              title={transaction.memo}
            >
              &ldquo;{transaction.memo}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <span
          className={cn('text-lg font-semibold', isIncoming ? 'text-success' : 'text-foreground')}
        >
          {isIncoming ? '+' : '-'}
          {formatAmount(transaction.quantity)}
        </span>
        <span className="ml-1 text-xs text-muted-foreground">MEDALS</span>
      </div>

      {/* External Link */}
      {transaction.txId && (
        <a
          href={`https://he.dtools.dev/tx/${transaction.txId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-muted-foreground/70 transition-colors hover:text-foreground/70"
          title="View on Hive Engine Explorer"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC = () => (
  <div className="py-12 text-center">
    <History className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
    <h3 className="text-lg font-medium text-foreground">No transactions yet</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Your MEDALS transaction history will appear here
    </p>
  </div>
);

/**
 * Loading state component
 */
const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    <span className="text-muted-foreground">Loading transactions...</span>
  </div>
);

/**
 * Error state component
 */
const ErrorState: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="py-8 text-center">
    <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
    <h3 className="text-lg font-medium text-foreground">Failed to load history</h3>
    <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
    <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

/**
 * Filter options
 */
const FILTER_OPTIONS = [
  { value: '', label: 'All transactions' },
  { value: 'transfer', label: 'Transfers only' },
  { value: 'stake', label: 'Staking only' },
  { value: 'delegate', label: 'Delegations only' },
];

/**
 * TransactionHistory component displays MEDALS transaction history
 */
export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  account,
  pageSize = 10,
  showFilter = true,
  className,
  compact = false,
}) => {
  const [offset, setOffset] = useState(0);
  const [filterType, setFilterType] = useState('');

  const {
    data: history,
    isLoading,
    error,
    refetch,
  } = useMedalsHistory(account, filterType || undefined, pageSize, offset);

  const transactions = history?.transactions || [];
  const pagination = history?.pagination;
  const hasMore = pagination?.hasMore || false;
  const total = pagination?.total || 0;

  // Pagination handlers
  const handlePrevPage = () => {
    if (offset >= pageSize) {
      setOffset(offset - pageSize);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setOffset(offset + pageSize);
    }
  };

  // Calculate page info
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.ceil(total / pageSize);

  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-3">
          {isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-500" />
            </div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-destructive">Failed to load</div>
          ) : transactions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No transactions</div>
          ) : (
            <div>
              {transactions.slice(0, 5).map((tx) => (
                <TransactionRow
                  key={tx.txId || `${tx.timestamp}-${tx.from}-${tx.to}`}
                  transaction={tx}
                  currentAccount={account}
                  compact
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-amber-500" />
            Transaction History
          </CardTitle>

          {showFilter && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground/70" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setOffset(0);
                }}
                className="rounded-md border border-border bg-white px-2 py-1 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error as Error} onRetry={() => refetch()} />
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Transaction List */}
            <div className="space-y-1">
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.txId || `${tx.timestamp}-${tx.from}-${tx.to}`}
                  transaction={tx}
                  currentAccount={account}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({total} total)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={offset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasMore}>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
