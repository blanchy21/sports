'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Wallet,
  RefreshCw,
  Coins,
  DollarSign,
  BarChart3,
  Eye,
  EyeOff,
  Medal,
  ExternalLink,
  ArrowRightLeft,
} from 'lucide-react';
import { StakingPanel, MarketInfo, TransferModal } from '@/components/medals';
import {
  PowerPanel,
  WalletCTAView,
  TransactionHistory,
  CryptoPricesGrid,
} from '@/components/wallet';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { usePrices } from '@/lib/react-query/queries/usePrices';
import {
  formatUSD,
  formatCrypto,
  formatPercentage,
  formatLargeNumber,
  calculateUSDValue,
  formatTime,
} from '@/lib/utils/client';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function WalletPage() {
  const {
    user,
    isAuthenticated,
    authType,
    refreshHiveAccount,
    hiveUser,
    isLoading: isAuthLoading,
  } = useAuth();
  const {
    bitcoinPrice,
    ethereumPrice,
    hivePrice,
    hbdPrice,
    isLoading: pricesLoading,
    error: priceError,
    lastUpdated,
    refreshPrices,
  } = usePrices();
  const router = useRouter();
  const [showBalances, setShowBalances] = useState(true);
  const [isRefreshingAccount, setIsRefreshingAccount] = useState(false);
  const [lastAccountRefresh, setLastAccountRefresh] = useState<Date | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const hasRefreshedBalances = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshAccountDataRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const hasFullWallet =
    authType === 'hive' || (authType === 'soft' && user?.keysDownloaded === true);
  const walletUsername = hiveUser?.username || user?.hiveUsername;

  // Redirect only if not authenticated at all (wait for auth to load first)
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const refreshAccountData = useCallback(async () => {
    if (!walletUsername) return;
    setIsRefreshingAccount(true);
    try {
      await refreshHiveAccount();
      setLastAccountRefresh(new Date());
    } catch (error) {
      logger.error('Error refreshing Hive account data', 'WalletPage', error);
    } finally {
      setIsRefreshingAccount(false);
    }
  }, [walletUsername, refreshHiveAccount]);

  useEffect(() => {
    refreshAccountDataRef.current = refreshAccountData;
  }, [refreshAccountData]);

  // Initial refresh on mount and automatic refresh interval
  useEffect(() => {
    if (!isAuthenticated || !hasFullWallet || !walletUsername) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    if (!hasRefreshedBalances.current) {
      hasRefreshedBalances.current = true;
      if (refreshAccountDataRef.current) {
        void refreshAccountDataRef.current();
      }
    }

    if (!refreshIntervalRef.current) {
      refreshIntervalRef.current = setInterval(() => {
        if (refreshAccountDataRef.current) {
          void refreshAccountDataRef.current();
        }
      }, 45 * 1000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, hasFullWallet, walletUsername]);

  if (isAuthLoading) {
    return (
      <MainLayout showRightSidebar={false} className="max-w-none">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Wallet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Loading...</h2>
            <p className="text-muted-foreground">Checking authentication status...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!hasFullWallet) {
    return (
      <MainLayout showRightSidebar={false} className="max-w-none">
        <WalletCTAView
          hivePrice={hivePrice}
          hbdPrice={hbdPrice}
          bitcoinPrice={bitcoinPrice}
          ethereumPrice={ethereumPrice}
        />
      </MainLayout>
    );
  }

  if (!user) return null;

  // Calculate USD values
  const hiveUSDValue =
    user.liquidHiveBalance && hivePrice ? calculateUSDValue(user.liquidHiveBalance, hivePrice) : 0;
  const hivePowerUSDValue =
    user.hivePower && hivePrice ? calculateUSDValue(user.hivePower, hivePrice) : 0;
  const hbdUSDValue =
    user.liquidHbdBalance && hbdPrice ? calculateUSDValue(user.liquidHbdBalance, hbdPrice) : 0;
  const savingsHbdUSDValue =
    user.savingsHbdBalance && hbdPrice ? calculateUSDValue(user.savingsHbdBalance, hbdPrice) : 0;
  const totalWalletValue = hiveUSDValue + hivePowerUSDValue + hbdUSDValue + savingsHbdUSDValue;

  return (
    <MainLayout showRightSidebar={false} className="max-w-none">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center space-x-3 text-3xl font-bold">
              <Wallet className="h-8 w-8 text-primary" />
              <span>Wallet</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your Hive assets and track cryptocurrency prices
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowBalances(!showBalances)}
              className="flex items-center space-x-2"
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showBalances ? 'Hide' : 'Show'} Balances</span>
            </Button>
            <Button
              variant="outline"
              onClick={refreshAccountData}
              disabled={isRefreshingAccount}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingAccount ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAccount ? 'Refreshing' : 'Refresh Balances'}</span>
            </Button>
            <Button
              variant="outline"
              onClick={refreshPrices}
              disabled={pricesLoading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Prices</span>
            </Button>
          </div>
        </div>

        {/* Price Error Alert */}
        {priceError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <p className="text-sm text-red-700 dark:text-red-400">
                Error loading cryptocurrency prices: {priceError}
              </p>
            </div>
          </div>
        )}

        {/* Total Portfolio Value */}
        <div className="rounded-lg bg-gradient-to-r from-primary via-bright-cobalt to-accent p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-2 text-lg font-semibold">Total Portfolio Value</h3>
              <p className="text-4xl font-bold">
                {showBalances
                  ? pricesLoading
                    ? 'Loading...'
                    : formatUSD(totalWalletValue)
                  : '••••••'}
              </p>
              <div className="mt-2 space-y-1 text-sm opacity-90">
                {lastUpdated && <p>Prices updated {formatTime(lastUpdated)}</p>}
                {lastAccountRefresh && <p>Balances refreshed {formatTime(lastAccountRefresh)}</p>}
              </div>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* HIVE Row */}
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
                {showBalances ? formatCrypto(user.liquidHiveBalance || 0, 'HIVE', 3) : '••••'}
              </p>
              {hivePrice && showBalances && (
                <p className="text-sm text-muted-foreground">{formatUSD(hiveUSDValue)}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Hive Power</p>
                <p className="text-xs text-muted-foreground">
                  Staked • {user.votingPower || 0}% VP
                </p>
              </div>
              <p className="text-2xl font-bold">
                {showBalances ? formatCrypto(user.hivePower || 0, 'HP', 2) : '••••'}
              </p>
              {hivePrice && showBalances && (
                <p className="text-sm text-muted-foreground">{formatUSD(hivePowerUSDValue)}</p>
              )}
              {showBalances && (
                <p className="text-xs text-muted-foreground">
                  {formatLargeNumber(user.hivePower || 0)} VESTS
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <PowerPanel
              account={walletUsername || user.username}
              liquidHive={user.liquidHiveBalance}
              onOperationComplete={() => refreshAccountData()}
            />
          </div>
        </div>

        {/* HBD Row */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">HBD</h3>
                <p className="text-sm text-muted-foreground">
                  Hive Backed Dollar •{' '}
                  {user.savingsApr ? formatPercentage(user.savingsApr, 1) : 'N/A'} APR
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
                {showBalances ? formatCrypto(user.liquidHbdBalance || 0, 'HBD', 2) : '••••'}
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
                {showBalances ? formatCrypto(user.savingsHbdBalance || 0, 'HBD', 2) : '••••'}
              </p>
              {hbdPrice && showBalances && (
                <p className="text-sm text-muted-foreground">{formatUSD(savingsHbdUSDValue)}</p>
              )}
            </div>
          </div>
        </div>

        {/* MEDALS Token Section */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <Medal className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">MEDALS Token</h3>
                <p className="text-sm text-muted-foreground">
                  Sportsblock Platform Token • Hive Engine
                </p>
              </div>
            </div>
            <div className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              Preview
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StakingPanel account={walletUsername || user.username} />

            <div className="space-y-4">
              <MarketInfo showTradeLinks={true} />

              <div className="flex gap-3">
                <a
                  href="https://tribaldex.com/trade/MEDALS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Buy MEDALS
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={() => setTransferModalOpen(true)}
                  className="flex-1"
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer MEDALS
                </Button>
              </div>
            </div>
          </div>
        </div>

        <CryptoPricesGrid bitcoinPrice={bitcoinPrice} ethereumPrice={ethereumPrice} />

        <TransactionHistory username={walletUsername || user.username} />

        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          account={walletUsername || user.username}
        />
      </div>
    </MainLayout>
  );
}
