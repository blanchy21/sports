'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Bitcoin,
  Coins,
  DollarSign,
  Activity,
  BarChart3,
  Eye,
  EyeOff,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Medal,
  Zap,
  Star,
  Users,
  Gift,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { PotentialEarningsWidget } from '@/components/widgets/PotentialEarningsWidget';
import Link from 'next/link';
import {
  WalletCard as MedalsWalletCard,
  StakingPanel,
  MarketInfo,
  TransferModal,
} from '@/components/medals';
import { PowerPanel } from '@/components/wallet';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { usePriceContext } from '@/contexts/PriceContext';
import {
  formatUSD,
  formatCrypto,
  formatPercentage,
  formatLargeNumber,
  calculateUSDValue,
  formatTime,
} from '@/lib/utils/client';
import { useRouter } from 'next/navigation';

interface TransactionOperation {
  id: number;
  timestamp: string;
  type: string;
  operation: Record<string, unknown>;
  blockNumber: number;
  transactionId: string;
  description: string;
}

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
  } = usePriceContext();
  const router = useRouter();
  const [showBalances, setShowBalances] = useState(true);
  const [transactions, setTransactions] = useState<TransactionOperation[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [isRefreshingAccount, setIsRefreshingAccount] = useState(false);
  const [lastAccountRefresh, setLastAccountRefresh] = useState<Date | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const hasRefreshedBalances = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshAccountDataRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Function to fetch transaction history
  const fetchTransactions = useCallback(async () => {
    if (!user?.username) return;

    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const response = await fetch(`/api/hive/account/history?username=${user.username}&limit=500`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.operations || []);
      } else {
        setTransactionsError(data.error || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactionsError('Failed to fetch transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [user?.username]);

  // Redirect only if not authenticated at all (wait for auth to load first)
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Fetch transactions when user is available
  useEffect(() => {
    if (user?.username && isAuthenticated && authType === 'hive') {
      fetchTransactions();
    }
  }, [user?.username, isAuthenticated, authType, fetchTransactions]);

  const refreshAccountData = useCallback(async () => {
    if (!hiveUser?.username) {
      return;
    }

    setIsRefreshingAccount(true);
    try {
      await refreshHiveAccount();
      setLastAccountRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing Hive account data:', error);
    } finally {
      setIsRefreshingAccount(false);
    }
  }, [hiveUser?.username, refreshHiveAccount]);

  // Store the latest refreshAccountData in a ref to avoid recreating intervals
  useEffect(() => {
    refreshAccountDataRef.current = refreshAccountData;
  }, [refreshAccountData]);

  // Initial refresh on mount and automatic refresh interval
  useEffect(() => {
    if (!isAuthenticated || authType !== 'hive' || !hiveUser?.username) {
      // Clear interval if user logs out or is not authenticated
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Initial refresh on mount
    if (!hasRefreshedBalances.current) {
      hasRefreshedBalances.current = true;
      void refreshAccountData();
    }

    // Set up automatic refresh interval (45 seconds)
    // Only set up interval if one doesn't already exist
    if (!refreshIntervalRef.current) {
      refreshIntervalRef.current = setInterval(() => {
        if (refreshAccountDataRef.current) {
          void refreshAccountDataRef.current();
        }
      }, 45 * 1000); // 45 seconds
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authType, hiveUser?.username]); // refreshAccountData intentionally excluded to prevent infinite loops

  // Helper function to get icon for transaction type
  const getTransactionIcon = (type: string) => {
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
        return <TrendingUp className="h-4 w-4" />;
      case 'power_up':
        return <TrendingUp className="h-4 w-4" />;
      case 'power_down':
        return <TrendingDown className="h-4 w-4" />;
      case 'delegate_vesting_shares':
        return <ArrowRightLeft className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Helper function to format transaction timestamp
  // Uses timezone-aware formatting to prevent hydration mismatches
  const formatTransactionTime = (timestamp: string) => {
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
    // Use UTC to prevent hydration mismatches
    return date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Show loading state
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

  // Show soft user wallet view with upgrade incentives
  if (authType === 'soft' || authType !== 'hive') {
    return (
      <MainLayout showRightSidebar={false} className="max-w-none">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="flex items-center space-x-3 text-3xl font-bold">
              <Wallet className="h-8 w-8 text-primary" />
              <span>Wallet</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Unlock earning potential by connecting your Hive wallet
            </p>
          </div>

          {/* Potential Earnings Widget */}
          <PotentialEarningsWidget className="max-w-2xl" />

          {/* Upgrade CTA Banner */}
          <div className="rounded-lg bg-gradient-to-r from-primary via-bright-cobalt to-accent p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="mb-2 flex items-center gap-2 text-2xl font-bold">
                  <Zap className="h-6 w-6" />
                  Start Earning Real Rewards
                </h3>
                <p className="mb-4 max-w-xl text-white/90">
                  Connect your Hive wallet to unlock cryptocurrency rewards for your posts,
                  comments, and engagement. Your content could be earning you money!
                </p>
                <Link href="/auth">
                  <Button
                    variant="secondary"
                    className="bg-white font-semibold text-primary hover:bg-white/90"
                  >
                    Connect Hive Wallet
                  </Button>
                </Link>
              </div>
              <div className="hidden rounded-lg bg-white/10 p-4 md:block">
                <Gift className="h-12 w-12" />
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Earn HIVE */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <h4 className="font-semibold">Earn HIVE & HBD</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Get rewarded in cryptocurrency for every post and comment. Popular content can earn
                significant rewards.
              </p>
            </div>

            {/* Curation Rewards */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <h4 className="font-semibold">Curation Rewards</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Earn rewards for discovering great content early. Vote on posts you like and share
                in the rewards.
              </p>
            </div>

            {/* Unlimited Posts */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <h4 className="font-semibold">Unlimited Posts</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                No post limits. Share as much content as you want, all stored permanently on the
                blockchain.
              </p>
            </div>

            {/* Community Engagement */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <h4 className="font-semibold">Full Engagement</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Comment and vote on any post in the community. Build your reputation and influence.
              </p>
            </div>

            {/* Decentralized */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-indigo-500/10 p-2">
                  <Shield className="h-5 w-5 text-indigo-500" />
                </div>
                <h4 className="font-semibold">Own Your Content</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Your posts live on the blockchain forever. No one can delete or censor your content.
              </p>
            </div>

            {/* MEDALS Token */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Medal className="h-5 w-5 text-amber-500" />
                </div>
                <h4 className="font-semibold">MEDALS Token</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Access exclusive MEDALS token rewards and staking. The Sportsblock community token.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-primary" />
              How Hive Rewards Work
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  1
                </div>
                <div>
                  <h4 className="mb-1 font-medium">Create Content</h4>
                  <p className="text-sm text-muted-foreground">
                    Post sports content, insights, and discussions to the community.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  2
                </div>
                <div>
                  <h4 className="mb-1 font-medium">Get Upvoted</h4>
                  <p className="text-sm text-muted-foreground">
                    Community members vote on your content over 7 days.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  3
                </div>
                <div>
                  <h4 className="mb-1 font-medium">Earn Crypto</h4>
                  <p className="text-sm text-muted-foreground">
                    After 7 days, rewards are paid out in HIVE and HBD.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Crypto Prices (Preview) */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Current Market Prices
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {hivePrice && (
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <Coins className="mx-auto mb-2 h-6 w-6 text-accent" />
                  <p className="text-sm text-muted-foreground">HIVE</p>
                  <p className="text-lg font-bold">{formatUSD(hivePrice)}</p>
                </div>
              )}
              {hbdPrice && (
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <DollarSign className="mx-auto mb-2 h-6 w-6 text-primary" />
                  <p className="text-sm text-muted-foreground">HBD</p>
                  <p className="text-lg font-bold">{formatUSD(hbdPrice)}</p>
                </div>
              )}
              {bitcoinPrice && (
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <Bitcoin className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                  <p className="text-sm text-muted-foreground">Bitcoin</p>
                  <p className="text-lg font-bold">{formatUSD(bitcoinPrice)}</p>
                </div>
              )}
              {ethereumPrice && (
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <Coins className="mx-auto mb-2 h-6 w-6 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Ethereum</p>
                  <p className="text-lg font-bold">{formatUSD(ethereumPrice)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Final CTA */}
          <div className="py-6 text-center">
            <h3 className="mb-2 text-xl font-semibold">Ready to start earning?</h3>
            <p className="mb-4 text-muted-foreground">
              Connect your Hive wallet and turn your sports knowledge into rewards.
            </p>
            <Link href="/auth">
              <Button size="lg" className="gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Connect Hive Wallet Now
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Guard for null user (shouldn't happen at this point, but TypeScript needs it)
  if (!user) {
    return null;
  }

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
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <p className="text-sm text-red-700">
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
            {/* Liquid HIVE */}
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

            {/* Hive Power */}
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

          {/* Power Up/Down Panel */}
          <div className="mt-6">
            <PowerPanel
              account={user.username}
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
            {/* Liquid HBD */}
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

            {/* Staked HBD */}
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
            <div className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">Preview</div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* MEDALS Wallet Card */}
            <MedalsWalletCard
              account={user.username}
              onStakeClick={() => {}}
              onSendClick={() => setTransferModalOpen(true)}
            />

            {/* MEDALS Market Info */}
            <MarketInfo showTradeLinks={true} />
          </div>

          {/* Staking Panel */}
          <div className="mt-6">
            <StakingPanel account={user.username} />
          </div>
        </div>

        {/* Crypto Row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Bitcoin */}
          {bitcoinPrice && (
            <div className="rounded-lg bg-gradient-to-r from-primary to-accent p-6 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bitcoin className="h-8 w-8" />
                  <div>
                    <h3 className="text-lg font-semibold">Bitcoin</h3>
                    <p className="text-sm opacity-90">BTC/USD</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatUSD(bitcoinPrice)}</p>
                  <p className="text-sm opacity-90">Current Price</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-75">Market Cap Leader</span>
                <span className="opacity-75">Digital Gold</span>
              </div>
            </div>
          )}

          {/* Ethereum */}
          {ethereumPrice && (
            <div className="rounded-lg bg-gradient-to-r from-primary to-accent p-6 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Coins className="h-8 w-8" />
                  <div>
                    <h3 className="text-lg font-semibold">Ethereum</h3>
                    <p className="text-sm opacity-90">ETH/USD</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatUSD(ethereumPrice)}</p>
                  <p className="text-sm opacity-90">Current Price</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-75">Smart Contracts</span>
                <span className="opacity-75">DeFi Platform</span>
              </div>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center text-lg font-semibold">
              <Activity className="mr-2 h-5 w-5" />
              Recent Monetary Transactions
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTransactions}
                disabled={transactionsLoading}
              >
                <RefreshCw
                  className={`mr-1 h-4 w-4 ${transactionsLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {transactionsLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
                <p className="text-lg font-medium">Loading transactions...</p>
                <p className="text-sm">Fetching your transaction history</p>
              </div>
            ) : transactionsError ? (
              <div className="py-12 text-center text-red-500">
                <Activity className="mx-auto mb-4 h-8 w-8 opacity-50" />
                <p className="text-lg font-medium">Error loading transactions</p>
                <p className="text-sm">{transactionsError}</p>
                <Button variant="outline" size="sm" onClick={fetchTransactions} className="mt-4">
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
                      <p className="text-xs text-muted-foreground">
                        Block #{transaction.blockNumber}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {transaction.transactionId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MEDALS Transfer Modal */}
        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          account={user.username}
        />
      </div>
    </MainLayout>
  );
}
