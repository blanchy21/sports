import React from 'react';
import { DollarSign } from 'lucide-react';
import { formatUSD, formatCrypto, formatPercentage } from '@/lib/utils/client';

interface HBDBalanceCardProps {
  showBalances: boolean;
  hbdPrice: number | null;
  hbdUSDValue: number;
  savingsHbdUSDValue: number;
  liquidHbdBalance: number;
  savingsHbdBalance: number;
  savingsApr: number | null;
}

export const HBDBalanceCard: React.FC<HBDBalanceCardProps> = ({
  showBalances,
  hbdPrice,
  hbdUSDValue,
  savingsHbdUSDValue,
  liquidHbdBalance,
  savingsHbdBalance,
  savingsApr,
}) => (
  <div className="rounded-lg border bg-card p-6">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="rounded-lg bg-primary/10 p-3">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">HBD</h3>
          <p className="text-sm text-muted-foreground">
            Hive Backed Dollar • {savingsApr ? formatPercentage(savingsApr, 1) : 'N/A'} APR
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold">{hbdPrice ? formatUSD(hbdPrice) : 'N/A'}</p>
        <p className="text-sm text-muted-foreground">Current Price</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Liquid HBD</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <p className="text-2xl font-bold">
          {showBalances ? formatCrypto(liquidHbdBalance, 'HBD', 2) : '••••'}
        </p>
        {hbdPrice && showBalances && (
          <p className="text-sm text-muted-foreground">{formatUSD(hbdUSDValue)}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Staked HBD</p>
          <p className="text-xs text-muted-foreground">Earning Interest</p>
        </div>
        <p className="text-2xl font-bold">
          {showBalances ? formatCrypto(savingsHbdBalance, 'HBD', 2) : '••••'}
        </p>
        {hbdPrice && showBalances && (
          <p className="text-sm text-muted-foreground">{formatUSD(savingsHbdUSDValue)}</p>
        )}
      </div>
    </div>
  </div>
);
