'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/core/Card';
import { Button } from '@/components/core/Button';
import { useMedalsMarket, type MedalsMarket } from '@/lib/react-query/queries/useMedals';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ArrowUpDown,
  Activity,
} from 'lucide-react';

interface MarketInfoProps {
  /** Additional className */
  className?: string;
  /** Compact mode for sidebars */
  compact?: boolean;
  /** Show buy/sell links to Tribaldex */
  showTradeLinks?: boolean;
}

/**
 * Format a price value with appropriate precision
 */
function formatPrice(price: string | number | undefined): string {
  if (!price) return '0.0000';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0.0000';
  // Use 4-6 decimal places for small prices
  if (num < 0.01) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  return num.toFixed(4);
}

/**
 * Format a volume/large number with abbreviation
 */
function formatVolume(value: string | number | undefined): string {
  if (!value) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

/**
 * Format percentage change
 */
function formatPercentChange(value: string | number | undefined): {
  text: string;
  isPositive: boolean;
  isZero: boolean;
} {
  if (!value) return { text: '0.00%', isPositive: false, isZero: true };
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return { text: '0.00%', isPositive: false, isZero: true };

  const isPositive = num > 0;
  const isZero = num === 0;
  const sign = isPositive ? '+' : '';
  return {
    text: `${sign}${num.toFixed(2)}%`,
    isPositive,
    isZero,
  };
}

/**
 * Stat display component
 */
interface StatProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  suffix?: string;
  trend?: { text: string; isPositive: boolean; isZero: boolean };
  className?: string;
}

const Stat: React.FC<StatProps> = ({ label, value, icon, suffix, trend, className }) => (
  <div className={cn('space-y-1', className)}>
    <span className="flex items-center gap-1 text-xs text-slate-500">
      {icon}
      {label}
    </span>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-semibold text-slate-900">{value}</span>
      {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      {trend && (
        <span
          className={cn(
            'ml-1 text-xs font-medium',
            trend.isZero ? 'text-slate-400' : trend.isPositive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {trend.isPositive && !trend.isZero && <TrendingUp className="mr-0.5 inline h-3 w-3" />}
          {!trend.isPositive && !trend.isZero && <TrendingDown className="mr-0.5 inline h-3 w-3" />}
          {trend.text}
        </span>
      )}
    </div>
  </div>
);

/**
 * Loading skeleton
 */
const MarketInfoSkeleton: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <Card className={cn('w-full', compact ? 'p-3' : '')}>
    {!compact && (
      <CardHeader>
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
      </CardHeader>
    )}
    <CardContent className={compact ? 'p-0' : ''}>
      <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Error state component
 */
const MarketInfoError: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
  <Card className="w-full">
    <CardContent className="py-8">
      <div className="flex flex-col items-center space-y-3 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <div>
          <p className="font-medium text-slate-900">Failed to load market data</p>
          <p className="text-sm text-slate-500">{error.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    </CardContent>
  </Card>
);

/**
 * Price card with large display
 */
const PriceDisplay: React.FC<{ market: MedalsMarket }> = ({ market }) => {
  const priceChange = formatPercentChange(market.priceChange24h);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
      <div className="rounded-full bg-amber-100 p-3">
        <DollarSign className="h-6 w-6 text-amber-600" />
      </div>
      <div className="flex-1">
        <span className="text-sm text-amber-700">MEDALS Price</span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-amber-900">{formatPrice(market.price)}</span>
          <span className="text-lg text-amber-700">HIVE</span>
        </div>
      </div>
      <div
        className={cn(
          'rounded-full px-3 py-1.5 text-sm font-semibold',
          priceChange.isZero
            ? 'bg-slate-100 text-slate-600'
            : priceChange.isPositive
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
        )}
      >
        {priceChange.isPositive && !priceChange.isZero && (
          <TrendingUp className="mr-1 inline h-4 w-4" />
        )}
        {!priceChange.isPositive && !priceChange.isZero && (
          <TrendingDown className="mr-1 inline h-4 w-4" />
        )}
        {priceChange.text}
      </div>
    </div>
  );
};

/**
 * Order book spread display
 */
const SpreadDisplay: React.FC<{ market: MedalsMarket }> = ({ market }) => {
  const bid = parseFloat(market.highestBid || '0');
  const ask = parseFloat(market.lowestAsk || '0');
  const spread = ask > 0 && bid > 0 ? ((ask - bid) / ask) * 100 : 0;

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <ArrowUpDown className="h-3 w-3" />
          Order Book
        </span>
        <span className="text-xs text-slate-400">
          {spread > 0 ? `${spread.toFixed(2)}% spread` : '—'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-green-600">Highest Bid</span>
          <div className="font-semibold text-green-700">{formatPrice(market.highestBid)} HIVE</div>
        </div>
        <div className="text-right">
          <span className="text-xs text-red-600">Lowest Ask</span>
          <div className="font-semibold text-red-700">{formatPrice(market.lowestAsk)} HIVE</div>
        </div>
      </div>
    </div>
  );
};

/**
 * MarketInfo component displays MEDALS market data from Tribaldex
 */
export const MarketInfo: React.FC<MarketInfoProps> = ({
  className,
  compact = false,
  showTradeLinks = true,
}) => {
  const { data: market, isLoading, error, refetch } = useMedalsMarket();

  if (isLoading) {
    return <MarketInfoSkeleton compact={compact} />;
  }

  if (error) {
    return <MarketInfoError error={error as Error} onRetry={() => refetch()} />;
  }

  if (!market) {
    return null;
  }

  const priceChange = formatPercentChange(market.priceChange24h);

  // Compact mode for sidebars
  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">MEDALS Market</span>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 w-7 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Price</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {formatPrice(market.price)} HIVE
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    priceChange.isZero
                      ? 'text-slate-400'
                      : priceChange.isPositive
                        ? 'text-green-600'
                        : 'text-red-600'
                  )}
                >
                  {priceChange.text}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">24h Volume</span>
              <span className="text-slate-700">{formatVolume(market.volume24h)} HIVE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Last Trade</span>
              <span className="text-slate-700">{formatPrice(market.lastPrice)} HIVE</span>
            </div>
          </div>

          {showTradeLinks && (
            <a
              href={`https://tribaldex.com/trade/MEDALS`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-50 py-2 text-sm text-amber-600 transition-colors hover:text-amber-700"
            >
              Trade on Tribaldex
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full mode
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            MEDALS Market
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {showTradeLinks && (
              <a
                href={`https://tribaldex.com/trade/MEDALS`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  Trade
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price Display */}
        <PriceDisplay market={market} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat
            label="24h Volume"
            value={formatVolume(market.volume24h)}
            suffix="HIVE"
            icon={<Activity className="h-3 w-3" />}
          />
          <Stat
            label="Market Cap"
            value={formatVolume(market.marketCap)}
            suffix="HIVE"
            icon={<BarChart3 className="h-3 w-3" />}
          />
          <Stat
            label="Last Trade"
            value={formatPrice(market.lastPrice)}
            suffix="HIVE"
            icon={<DollarSign className="h-3 w-3" />}
          />
          <Stat
            label="24h Change"
            value=""
            trend={priceChange}
            icon={
              priceChange.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )
            }
          />
        </div>

        {/* Order Book Spread */}
        <SpreadDisplay market={market} />

        {/* Notice if market data is stale */}
        {market.message && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            {market.message}
          </div>
        )}

        {/* Last Updated */}
        {market.timestamp && (
          <div className="text-center text-xs text-slate-400">
            Last updated: {new Date(market.timestamp).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketInfo;
