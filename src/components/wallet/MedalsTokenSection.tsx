import React from 'react';
import { Medal, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { StakingPanel, MarketInfo } from '@/components/medals';
import { Button } from '@/components/core/Button';

interface MedalsTokenSectionProps {
  walletUsername: string;
  onTransferClick: () => void;
}

export const MedalsTokenSection: React.FC<MedalsTokenSectionProps> = ({
  walletUsername,
  onTransferClick,
}) => (
  <div className="rounded-lg border bg-card p-6">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="rounded-lg bg-warning/10 p-3">
          <Medal className="h-6 w-6 text-warning" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">MEDALS Token</h3>
          <p className="text-sm text-muted-foreground">Sportsblock Platform Token • Hive Engine</p>
        </div>
      </div>
      <div className="rounded bg-warning/10 px-2 py-1 text-xs text-warning">Preview</div>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <StakingPanel account={walletUsername} />

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
              className="w-full border-warning/30 text-warning hover:bg-warning/10"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Buy MEDALS
            </Button>
          </a>
          <Button variant="outline" onClick={onTransferClick} className="flex-1">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transfer MEDALS
          </Button>
        </div>
      </div>
    </div>
  </div>
);
