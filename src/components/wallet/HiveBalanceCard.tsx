import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { PowerPanel } from './PowerPanel';
import { formatUSD, formatCrypto, formatLargeNumber } from '@/lib/utils/client';

interface HiveBalanceCardProps {
  showBalances: boolean;
  hivePrice: number | null;
  hiveUSDValue: number;
  hivePowerUSDValue: number;
  liquidHiveBalance: number;
  hivePower: number;
  votingPower: number;
  walletUsername: string;
  onPowerOperationComplete: () => void;
  onSendClick?: () => void;
}

export const HiveBalanceCard: React.FC<HiveBalanceCardProps> = ({
  showBalances,
  hivePrice,
  hiveUSDValue,
  hivePowerUSDValue,
  liquidHiveBalance,
  hivePower,
  votingPower,
  walletUsername,
  onPowerOperationComplete,
  onSendClick,
}) => (
  <div className="rounded-lg border bg-sb-stadium p-6">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Liquid HIVE</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <p className="text-2xl font-bold">
          {showBalances ? formatCrypto(liquidHiveBalance, 'HIVE', 3) : '••••'}
        </p>
        {hivePrice && showBalances && (
          <p className="text-sm text-muted-foreground">{formatUSD(hiveUSDValue)}</p>
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
          <p className="text-sm text-muted-foreground">Hive Power</p>
          <p className="text-xs text-muted-foreground">Staked • {votingPower}% VP</p>
        </div>
        <p className="text-2xl font-bold">
          {showBalances ? formatCrypto(hivePower, 'HP', 2) : '••••'}
        </p>
        {hivePrice && showBalances && (
          <p className="text-sm text-muted-foreground">{formatUSD(hivePowerUSDValue)}</p>
        )}
        {showBalances && (
          <p className="text-xs text-muted-foreground">{formatLargeNumber(hivePower)} VESTS</p>
        )}
      </div>
    </div>

    <div className="mt-6">
      <PowerPanel
        account={walletUsername}
        liquidHive={liquidHiveBalance}
        onOperationComplete={onPowerOperationComplete}
      />
    </div>
  </div>
);
