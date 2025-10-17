"use client";

import React, { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePriceContext } from "@/contexts/PriceContext";
import { 
  formatUSD, 
  formatCrypto, 
  formatPercentage,
  formatLargeNumber,
  calculateUSDValue
} from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WalletPage() {
  const { user, isAuthenticated, authType } = useAuth();
  const { bitcoinPrice, ethereumPrice, hivePrice, hbdPrice, isLoading: pricesLoading, error: priceError, lastUpdated, refreshPrices } = usePriceContext();
  const router = useRouter();
  const [showBalances, setShowBalances] = useState(true);

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
            <p className="text-muted-foreground">Please connect your Hive account to view wallet information.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Calculate USD values
  const hiveUSDValue = user.liquidHiveBalance && hivePrice ? calculateUSDValue(user.liquidHiveBalance, hivePrice) : 0;
  const hivePowerUSDValue = user.hivePower && hivePrice ? calculateUSDValue(user.hivePower, hivePrice) : 0;
  const hbdUSDValue = user.liquidHbdBalance && hbdPrice ? calculateUSDValue(user.liquidHbdBalance, hbdPrice) : 0;
  const savingsHbdUSDValue = user.savingsHbdBalance && hbdPrice ? calculateUSDValue(user.savingsHbdBalance, hbdPrice) : 0;
  const totalWalletValue = hiveUSDValue + hivePowerUSDValue + hbdUSDValue + savingsHbdUSDValue;

  return (
    <MainLayout showRightSidebar={false} className="max-w-none">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Wallet className="h-8 w-8 text-primary" />
              <span>Wallet</span>
            </h1>
            <p className="text-muted-foreground mt-2">
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-sm text-red-700">
                Error loading cryptocurrency prices: {priceError}
              </p>
            </div>
          </div>
        )}


        {/* Total Portfolio Value */}
        <div className="bg-gradient-to-r from-primary via-teal-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Total Portfolio Value</h3>
              <p className="text-4xl font-bold">
                {showBalances ? (pricesLoading ? "Loading..." : formatUSD(totalWalletValue)) : "••••••"}
              </p>
              <p className="text-sm opacity-90 mt-2">
                {lastUpdated && `Last updated ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
            <div className="p-4 bg-white/10 rounded-lg">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* HIVE Row */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Coins className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">HIVE</h3>
                <p className="text-sm text-muted-foreground">Hive Blockchain Native Token</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {hivePrice ? formatUSD(hivePrice) : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Current Price</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liquid HIVE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Liquid HIVE</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <p className="text-2xl font-bold">
                {showBalances ? formatCrypto(user.liquidHiveBalance || 0, 'HIVE', 3) : "••••"}
              </p>
              {hivePrice && showBalances && (
                <p className="text-sm text-muted-foreground">
                  {formatUSD(hiveUSDValue)}
                </p>
              )}
            </div>

            {/* Hive Power */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Hive Power</p>
                <p className="text-xs text-muted-foreground">Staked • {user.votingPower || 0}% VP</p>
              </div>
              <p className="text-2xl font-bold">
                {showBalances ? formatCrypto(user.hivePower || 0, 'HP', 2) : "••••"}
              </p>
              {hivePrice && showBalances && (
                <p className="text-sm text-muted-foreground">
                  {formatUSD(hivePowerUSDValue)}
                </p>
              )}
              {showBalances && (
                <p className="text-xs text-muted-foreground">
                  {formatLargeNumber(user.hivePower || 0)} VESTS
                </p>
              )}
            </div>
          </div>
        </div>

        {/* HBD Row */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">HBD</h3>
                <p className="text-sm text-muted-foreground">Hive Backed Dollar • {user.savingsApr ? formatPercentage(user.savingsApr, 1) : "N/A"} APR</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {hbdPrice ? formatUSD(hbdPrice) : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Current Price</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liquid HBD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Liquid HBD</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <p className="text-2xl font-bold">
                {showBalances ? formatCrypto(user.liquidHbdBalance || 0, 'HBD', 2) : "••••"}
              </p>
              {hbdPrice && showBalances && (
                <p className="text-sm text-muted-foreground">
                  {formatUSD(hbdUSDValue)}
                </p>
              )}
            </div>

            {/* Staked HBD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Staked HBD</p>
                <p className="text-xs text-muted-foreground">Earning Interest</p>
              </div>
              <p className="text-2xl font-bold">
                {showBalances ? formatCrypto(user.savingsHbdBalance || 0, 'HBD', 2) : "••••"}
              </p>
              {hbdPrice && showBalances && (
                <p className="text-sm text-muted-foreground">
                  {formatUSD(savingsHbdUSDValue)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Crypto Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bitcoin */}
          {bitcoinPrice && (
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
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
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
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
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Transactions
            </h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Placeholder for transaction list */}
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No transactions yet</p>
              <p className="text-sm">Your transaction history will appear here</p>
              <p className="text-xs mt-2 opacity-75">
                Transactions include transfers, votes, posts, and other Hive activities
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
