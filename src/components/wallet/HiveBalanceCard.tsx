import React from 'react';
import { Coins } from 'lucide-react';
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
}) => (
  <div className="rounded-lg border bg-card p-6">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="rounded-lg bg-accent/10 p-3">
          <Coins className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">HIVE</h3>
          <p className="text-sm text-muted-foreground">Hive Blockchain Native Token</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold">{hivePrice ? formatUSD(hivePrice) : 'N/A'}</p>
        <p className="text-sm text-muted-foreground">Current Price</p>
      </div>
    </div>

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
