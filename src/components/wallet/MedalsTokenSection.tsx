import React from 'react';
import { ArrowDownUp, ArrowRightLeft } from 'lucide-react';
import { StakingPanel, StakingRankCard, MarketInfo } from '@/components/medals';
import { Button } from '@/components/core/Button';

interface MedalsTokenSectionProps {
  walletUsername: string;
  onTransferClick: () => void;
  onSwapClick: () => void;
}

export const MedalsTokenSection: React.FC<MedalsTokenSectionProps> = ({
  walletUsername,
  onTransferClick,
  onSwapClick,
}) => (
  <div className="rounded-lg border bg-card p-6">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <StakingPanel account={walletUsername} />

      <div className="space-y-4">
        <MarketInfo showTradeLinks={true} />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onSwapClick}
            className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
          >
            <ArrowDownUp className="mr-2 h-4 w-4" />
            Buy MEDALS
          </Button>
          <Button variant="outline" onClick={onTransferClick} className="flex-1">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transfer MEDALS
          </Button>
        </div>
      </div>
    </div>

    <StakingRankCard account={walletUsername} className="mt-6" />
  </div>
);
