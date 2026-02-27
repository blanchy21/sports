'use client';

import React from 'react';
import { Bitcoin, Coins } from 'lucide-react';
import { formatUSD } from '@/lib/utils/client';

interface CryptoPricesGridProps {
  bitcoinPrice: number | null;
  ethereumPrice: number | null;
}

export function CryptoPricesGrid({ bitcoinPrice, ethereumPrice }: CryptoPricesGridProps) {
  if (!bitcoinPrice && !ethereumPrice) return null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
  );
}
