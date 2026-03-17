'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  WalletCard,
  StakingPanel,
  TransferModal,
  TransactionHistory,
  MarketInfo,
  PremiumBadge,
  PremiumBadgeOutline,
  PremiumTierProgress,
} from '@/components/medals';

/**
 * Demo page for MEDALS token UI components
 * This page showcases all the components without requiring authentication
 */
export default function MedalsDemoPage() {
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [, setStakingModalOpen] = useState(false);

  // Demo account for testing
  const demoAccount = 'sportsblock';

  return (
    <MainLayout showRightSidebar={false} className="max-w-none">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">MEDALS Token UI Demo</h1>
          <p className="mt-2 text-muted-foreground">
            Preview of all MEDALS token components. Using demo account: @{demoAccount}
          </p>
          <p className="mt-1 text-sm text-amber-600">
            Note: The MEDALS token is not yet created. This is a preview of the planned UI.
          </p>
        </div>

        {/* Premium Badge Showcase */}
        <section className="space-y-4">
          <h2 className="border-b pb-2 text-xl font-semibold">Premium Badges</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Filled Badges:</p>
              <div className="flex gap-2">
                <PremiumBadge tier="BRONZE" />
                <PremiumBadge tier="SILVER" />
                <PremiumBadge tier="GOLD" />
                <PremiumBadge tier="PLATINUM" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Outline Badges:</p>
              <div className="flex gap-2">
                <PremiumBadgeOutline tier="BRONZE" />
                <PremiumBadgeOutline tier="SILVER" />
                <PremiumBadgeOutline tier="GOLD" />
                <PremiumBadgeOutline tier="PLATINUM" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Icon Only:</p>
              <div className="flex gap-2">
                <PremiumBadge tier="BRONZE" showLabel={false} />
                <PremiumBadge tier="SILVER" showLabel={false} />
                <PremiumBadge tier="GOLD" showLabel={false} />
                <PremiumBadge tier="PLATINUM" showLabel={false} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sizes:</p>
              <div className="flex items-center gap-2">
                <PremiumBadge tier="GOLD" size="sm" />
                <PremiumBadge tier="GOLD" size="md" />
                <PremiumBadge tier="GOLD" size="lg" />
              </div>
            </div>
          </div>
        </section>

        {/* Premium Progress */}
        <section className="space-y-4">
          <h2 className="border-b pb-2 text-xl font-semibold">Premium Tier Progress</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-sb-stadium p-4">
              <p className="mb-3 text-sm text-muted-foreground">500 MEDALS staked (No tier yet):</p>
              <PremiumTierProgress currentStaked={500} />
            </div>
            <div className="rounded-lg border bg-sb-stadium p-4">
              <p className="mb-3 text-sm text-muted-foreground">3,000 MEDALS staked (Bronze):</p>
              <PremiumTierProgress currentStaked={3000} />
            </div>
            <div className="rounded-lg border bg-sb-stadium p-4">
              <p className="mb-3 text-sm text-muted-foreground">15,000 MEDALS staked (Silver):</p>
              <PremiumTierProgress currentStaked={15000} />
            </div>
            <div className="rounded-lg border bg-sb-stadium p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                100,000+ MEDALS (Platinum - Max tier):
              </p>
              <PremiumTierProgress currentStaked={150000} />
            </div>
          </div>
        </section>

        {/* Main Components Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Wallet Card */}
          <section className="space-y-4">
            <h2 className="border-b pb-2 text-xl font-semibold">Wallet Card</h2>
            <WalletCard
              account={demoAccount}
              onStakeClick={() => setStakingModalOpen(true)}
              onSendClick={() => setTransferModalOpen(true)}
            />
          </section>

          {/* Market Info */}
          <section className="space-y-4">
            <h2 className="border-b pb-2 text-xl font-semibold">Market Info</h2>
            <MarketInfo showTradeLinks={true} />
          </section>
        </div>

        {/* Compact Variants */}
        <section className="space-y-4">
          <h2 className="border-b pb-2 text-xl font-semibold">Compact Variants (for sidebars)</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <WalletCard account={demoAccount} compact />
            <MarketInfo compact />
            <TransactionHistory account={demoAccount} compact />
          </div>
        </section>

        {/* Staking Panel */}
        <section className="space-y-4">
          <h2 className="border-b pb-2 text-xl font-semibold">Staking Panel</h2>
          <div className="max-w-xl">
            <StakingPanel account={demoAccount} />
          </div>
        </section>

        {/* Transaction History */}
        <section className="space-y-4">
          <h2 className="border-b pb-2 text-xl font-semibold">Transaction History</h2>
          <TransactionHistory account={demoAccount} pageSize={5} />
        </section>

        {/* Transfer Modal Trigger */}
        <section className="space-y-4">
          <h2 className="border-b pb-2 text-xl font-semibold">Transfer Modal</h2>
          <p className="text-muted-foreground">
            Click the button below to open the transfer modal:
          </p>
          <button
            onClick={() => setTransferModalOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-[#051A14] hover:bg-primary/90"
          >
            Open Transfer Modal
          </button>
        </section>

        {/* Transfer Modal */}
        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          account={demoAccount}
        />
      </div>
    </MainLayout>
  );
}
