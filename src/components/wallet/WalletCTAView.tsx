'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wallet,
  DollarSign,
  Activity,
  Zap,
  Star,
  Users,
  Gift,
  Shield,
  Medal,
  TrendingUp,
  Bitcoin,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/core/Button';
import { PotentialEarningsWidget } from '@/components/widgets/PotentialEarningsWidget';
import { formatUSD } from '@/lib/utils/client';

interface WalletCTAViewProps {
  hivePrice: number | null;
  hbdPrice: number | null;
  bitcoinPrice: number | null;
  ethereumPrice: number | null;
}

export function WalletCTAView({
  hivePrice,
  hbdPrice,
  bitcoinPrice,
  ethereumPrice,
}: WalletCTAViewProps) {
  return (
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
              Connect your Hive wallet to unlock cryptocurrency rewards for your posts, comments,
              and engagement. Your content could be earning you money!
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

        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Star className="h-5 w-5 text-amber-500" />
            </div>
            <h4 className="font-semibold">Curation Rewards</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Earn rewards for discovering great content early. Vote on posts you like and share in
            the rewards.
          </p>
        </div>

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
  );
}
