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
        <div className="rounded-lg border bg-sb-stadium p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bitcoin className="h-8 w-8 text-warning" />
              <div>
                <h3 className="text-lg font-semibold">Bitcoin</h3>
                <p className="text-sm text-muted-foreground">BTC/USD</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatUSD(bitcoinPrice)}</p>
              <p className="text-sm text-muted-foreground">Current Price</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Market Cap Leader</span>
            <span>Digital Gold</span>
          </div>
        </div>
      )}

      {ethereumPrice && (
        <div className="rounded-lg border bg-sb-stadium p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Coins className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Ethereum</h3>
                <p className="text-sm text-muted-foreground">ETH/USD</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatUSD(ethereumPrice)}</p>
              <p className="text-sm text-muted-foreground">Current Price</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Smart Contracts</span>
            <span>DeFi Platform</span>
          </div>
        </div>
      )}
    </div>
  );
}
