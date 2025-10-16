"use client";

import React, { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  Calendar,
  PieChart,
  FileText,
  RefreshCw,
  ExternalLink,
  Bitcoin,
  Coins,
  PiggyBank,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePriceContext } from "@/contexts/PriceContext";
import { 
  formatUSD, 
  formatCrypto, 
  formatCryptoWithUSD, 
  formatPercentage,
  formatLargeNumber,
  calculateUSDValue
} from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function MonetisationPage() {
  const { user, isAuthenticated, authType } = useAuth();
  const { bitcoinPrice, hivePrice, hbdPrice, isLoading: pricesLoading, error: priceError, lastUpdated, refreshPrices } = usePriceContext();
  const router = useRouter();

  // Redirect if not authenticated or not a Hive user
  useEffect(() => {
    if (!isAuthenticated || authType !== "hive" || !user) {
      router.push("/");
    }
  }, [isAuthenticated, authType, user, router]);

  if (!isAuthenticated || authType !== "hive" || !user) {
    return (
      <MainLayout showRightSidebar={false} className="max-w-none">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please connect your Hive account to view monetization data.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Calculate USD values
  const hiveUSDValue = user.liquidHiveBalance && hivePrice ? calculateUSDValue(user.liquidHiveBalance, hivePrice) : 0;
  const hbdUSDValue = user.liquidHbdBalance && hbdPrice ? calculateUSDValue(user.liquidHbdBalance, hbdPrice) : 0;
  const savingsHbdUSDValue = user.savingsHbdBalance && hbdPrice ? calculateUSDValue(user.savingsHbdBalance, hbdPrice) : 0;
  const totalWalletValue = hiveUSDValue + hbdUSDValue + savingsHbdUSDValue;

  // Calculate HBD savings interest
  const annualInterest = user.savingsHbdBalance && user.savingsApr ? 
    (user.savingsHbdBalance * user.savingsApr / 100) : 0;
  const annualInterestUSD = hbdPrice ? calculateUSDValue(annualInterest, hbdPrice) : 0;

  return (
    <MainLayout showRightSidebar={false} className="max-w-none">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <span>Monetisation</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your earnings and rewards from the Hive blockchain
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={refreshPrices}
              disabled={pricesLoading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Prices</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Wallet className="h-4 w-4" />
              <span>Withdraw</span>
            </Button>
          </div>
        </div>

        {/* Price Error Alert */}
        {priceError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-sm text-red-700">
                Error loading cryptocurrency prices: {priceError}
              </p>
            </div>
          </div>
        )}

        {/* Debug section - remove this after testing */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-bold mb-2 text-yellow-800">Debug Info:</h4>
          <div className="text-sm text-yellow-700">
            <p>User: {user.username}</p>
            <p>Hive Stats: {JSON.stringify(user.hiveStats, null, 2)}</p>
            <p>Liquid HIVE: {user.liquidHiveBalance}</p>
            <p>Liquid HBD: {user.liquidHbdBalance}</p>
            <p>Savings HIVE: {user.savingsHiveBalance}</p>
            <p>Savings HBD: {user.savingsHbdBalance}</p>
            <p>Savings APR: {user.savingsApr}</p>
            <p>Pending Withdrawals: {user.pendingWithdrawals?.length || 0}</p>
            <p>Bitcoin Price: {bitcoinPrice}</p>
            <p>HIVE Price: {hivePrice}</p>
            <p>HBD Price: {hbdPrice}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Wallet Value */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Wallet Value</p>
                <h3 className="text-2xl font-bold mt-1">
                  {pricesLoading ? "Loading..." : formatUSD(totalWalletValue)}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          {/* This Month - Placeholder */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <h3 className="text-2xl font-bold mt-1">$0.00</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Connect your Hive account to view detailed earnings history
                </p>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-teal-500" />
              </div>
            </div>
          </div>

          {/* Pending - Placeholder */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <h3 className="text-2xl font-bold mt-1">$0.00</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Connect your Hive account to view pending payouts
                </p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
          </div>

          {/* Total Posts */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <h3 className="text-2xl font-bold mt-1">
                  {user.hiveStats?.postCount || 0}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  {user.hiveStats?.commentCount || 0} comments
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Chart - Placeholder */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-primary" />
                <span>Earnings Overview</span>
              </h3>
            </div>
            
            <div className="flex items-center justify-center min-h-[200px] text-center">
              <div>
                <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Connect your Hive account to view detailed earnings history
                </p>
              </div>
            </div>
          </div>

          {/* Top Performing Posts - Placeholder */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Top Performing Posts</h3>
            <div className="flex items-center justify-center min-h-[200px] text-center">
              <div>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Connect your Hive account to view your top performing posts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hive Account Info */}
        <div className="bg-gradient-to-r from-primary via-teal-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Hive Account Connected</h3>
              <p className="text-sm opacity-90 mb-4">
                @{user.hiveUsername} • Reputation: {user.reputationFormatted || 'N/A'}
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm opacity-75">HIVE Balance</p>
                  <p className="text-xl font-bold">
                    {formatCrypto(user.liquidHiveBalance || 0, 'HIVE', 3)}
                  </p>
                  {hivePrice && (
                    <p className="text-sm opacity-75">
                      {formatUSD(hiveUSDValue)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm opacity-75">HBD Balance</p>
                  <p className="text-xl font-bold">
                    {formatCrypto(user.liquidHbdBalance || 0, 'HBD', 2)}
                  </p>
                  {hbdPrice && (
                    <p className="text-sm opacity-75">
                      {formatUSD(hbdUSDValue)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm opacity-75">HP</p>
                  <p className="text-xl font-bold">
                    {formatCrypto(user.hivePower || 0, 'HP', 2)}
                  </p>
                  <p className="text-sm opacity-75">
                    {formatLargeNumber(user.hivePower || 0)} VESTS
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => window.open(`https://hive.blog/@${user.hiveUsername}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Hive
            </Button>
          </div>
        </div>

        {/* HBD Savings Card */}
        {(user.savingsHbdBalance && user.savingsHbdBalance > 0) && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center space-x-2">
                  <PiggyBank className="h-5 w-5" />
                  <span>HBD Savings</span>
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  Earn interest on your HBD savings
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-75">Savings Balance</p>
                    <p className="text-xl font-bold">
                      {formatCrypto(user.savingsHbdBalance, 'HBD', 2)}
                    </p>
                    {hbdPrice && (
                      <p className="text-sm opacity-75">
                        {formatUSD(savingsHbdUSDValue)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Current APR</p>
                    <p className="text-xl font-bold">
                      {formatPercentage(user.savingsApr || 0, 1)}
                    </p>
                    <p className="text-sm opacity-75">
                      ~{formatCrypto(annualInterest, 'HBD', 2)}/year
                    </p>
                  </div>
                </div>

                {user.pendingWithdrawals && user.pendingWithdrawals.length > 0 && (
                  <div className="mt-4 p-3 bg-white/10 rounded-lg">
                    <p className="text-sm font-medium mb-2 flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Pending Withdrawals</span>
                    </p>
                    <div className="space-y-1">
                      {user.pendingWithdrawals.slice(0, 3).map((withdrawal, index) => (
                        <div key={index} className="text-sm opacity-90">
                          {withdrawal.amount} HBD • {new Date(withdrawal.timestamp).toLocaleDateString()}
                        </div>
                      ))}
                      {user.pendingWithdrawals.length > 3 && (
                        <div className="text-sm opacity-75">
                          +{user.pendingWithdrawals.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bitcoin Price Card */}
        {bitcoinPrice && (
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center space-x-2">
                  <Bitcoin className="h-5 w-5" />
                  <span>Bitcoin Price</span>
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  Current market price
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-75">BTC Price</p>
                    <p className="text-2xl font-bold">
                      {formatUSD(bitcoinPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Last Updated</p>
                    <p className="text-lg font-semibold">
                      {lastUpdated?.toLocaleTimeString() || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table - Placeholder */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Recent Transactions</h3>
          <div className="flex items-center justify-center min-h-[200px] text-center">
            <div>
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Connect your Hive account to view detailed transaction history
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}