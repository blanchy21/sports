import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { formatUSD, formatCrypto } from '@/lib/utils/client';

interface HBDBalanceCardProps {
  showBalances: boolean;
  hbdPrice: number | null;
  hbdUSDValue: number;
  savingsHbdUSDValue: number;
  liquidHbdBalance: number;
  savingsHbdBalance: number;
  onSendClick?: () => void;
}

export const HBDBalanceCard: React.FC<HBDBalanceCardProps> = ({
  showBalances,
  hbdPrice,
  hbdUSDValue,
  savingsHbdUSDValue,
  liquidHbdBalance,
  savingsHbdBalance,
  onSendClick,
}) => (
  <div className="rounded-lg border bg-sb-stadium p-6">
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
        {onSendClick && (
          <Button variant="outline" size="sm" onClick={onSendClick} className="mt-2">
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
            Send
          </Button>
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
