'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Plus, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Community } from '@/types';
import { cn } from '@/lib/utils/client';

export type RewardsOption = '50_50' | 'power_up' | 'decline';

export interface Beneficiary {
  account: string;
  weight: number; // In basis points (100 = 1%)
}

export interface AdvancedOptionsProps {
  // Community
  selectedCommunity: Community | null;
  onCommunityChange: (community: Community | null) => void;
  userCommunities?: Community[];
  allCommunities?: Community[];

  // Rewards
  rewardsOption: RewardsOption;
  onRewardsChange: (option: RewardsOption) => void;

  // Beneficiaries
  beneficiaries: Beneficiary[];
  onBeneficiariesChange: (beneficiaries: Beneficiary[]) => void;

  // Cover image
  coverImage: string;
  onCoverImageChange: (url: string) => void;
  detectedImages?: string[];

  // Is Hive user
  isHiveUser: boolean;

  // Default expanded state
  defaultExpanded?: boolean;
}

const REWARDS_OPTIONS = [
  {
    value: '50_50' as const,
    label: '50% HBD / 50% HP',
    description: 'Receive half in liquid HBD and half in Hive Power',
  },
  {
    value: 'power_up' as const,
    label: '100% Power Up',
    description: 'Receive all rewards as Hive Power',
  },
  {
    value: 'decline' as const,
    label: 'Decline Payout',
    description: 'No rewards - altruistic posting',
  },
];

export function AdvancedOptions({
  selectedCommunity,
  onCommunityChange,
  userCommunities = [],
  allCommunities = [],
  rewardsOption,
  onRewardsChange,
  beneficiaries,
  onBeneficiariesChange,
  coverImage,
  onCoverImageChange,
  detectedImages = [],
  isHiveUser,
  defaultExpanded = false,
}: AdvancedOptionsProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [newBeneficiary, setNewBeneficiary] = React.useState({ account: '', weight: 5 });

  const handleAddBeneficiary = () => {
    if (!newBeneficiary.account.trim()) return;

    // Check if account already exists
    if (beneficiaries.some((b) => b.account === newBeneficiary.account)) {
      return;
    }

    // Check total weight doesn't exceed 100%
    const totalWeight = beneficiaries.reduce((sum, b) => sum + b.weight, 0) + newBeneficiary.weight;
    if (totalWeight > 100) {
      return;
    }

    onBeneficiariesChange([
      ...beneficiaries,
      { account: newBeneficiary.account.trim().toLowerCase(), weight: newBeneficiary.weight },
    ]);
    setNewBeneficiary({ account: '', weight: 5 });
  };

  const handleRemoveBeneficiary = (account: string) => {
    // Don't allow removing the default sportsblock beneficiary
    if (account === 'sportsblock') return;
    onBeneficiariesChange(beneficiaries.filter((b) => b.account !== account));
  };

  const totalBeneficiaryWeight = beneficiaries.reduce((sum, b) => sum + b.weight, 0);

  return (
    <div className="bg-card rounded-lg border">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3',
          'text-foreground text-sm font-medium',
          'hover:bg-muted/50 transition-colors',
          isExpanded && 'border-b'
        )}
      >
        <span>ADVANCED OPTIONS</span>
        {isExpanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-6 p-4">
          {/* Community Selection */}
          <div className="space-y-2">
            <label className="text-foreground text-sm font-medium">Community (Optional)</label>
            <select
              value={selectedCommunity?.id || ''}
              onChange={(e) => {
                const communityId = e.target.value;
                if (!communityId) {
                  onCommunityChange(null);
                } else {
                  const community = [...userCommunities, ...allCommunities].find(
                    (c) => c.id === communityId
                  );
                  onCommunityChange(community || null);
                }
              }}
              className={cn(
                'bg-background w-full rounded-lg border px-3 py-2',
                'focus:ring-ring text-sm focus:ring-2 focus:outline-hidden'
              )}
            >
              <option value="">Main Sportsblock Feed</option>
              {userCommunities.length > 0 && (
                <optgroup label="Your Communities">
                  {userCommunities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {allCommunities.length > 0 && (
                <optgroup label="All Communities">
                  {allCommunities
                    .filter((c) => !userCommunities.some((uc) => uc.id === c.id))
                    .map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Rewards Distribution (Hive users only) */}
          {isHiveUser && (
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Rewards Distribution</label>
              <select
                value={rewardsOption}
                onChange={(e) => onRewardsChange(e.target.value as RewardsOption)}
                className={cn(
                  'bg-background w-full rounded-lg border px-3 py-2',
                  'focus:ring-ring text-sm focus:ring-2 focus:outline-hidden'
                )}
              >
                {REWARDS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                {REWARDS_OPTIONS.find((o) => o.value === rewardsOption)?.description}
              </p>
            </div>
          )}

          {/* Beneficiaries (Hive users only) */}
          {isHiveUser && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-foreground text-sm font-medium">Beneficiaries</label>
                <span className="text-muted-foreground text-xs">
                  {totalBeneficiaryWeight}% allocated
                </span>
              </div>

              {/* Existing beneficiaries */}
              <div className="space-y-2">
                {beneficiaries.map((ben) => (
                  <div
                    key={ben.account}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2',
                      'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">@{ben.account}</span>
                      {ben.account === 'sportsblock' && (
                        <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">
                          Platform
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">{ben.weight}%</span>
                      {ben.account !== 'sportsblock' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBeneficiary(ben.account)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new beneficiary */}
              {totalBeneficiaryWeight < 100 && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBeneficiary.account}
                    onChange={(e) =>
                      setNewBeneficiary({ ...newBeneficiary, account: e.target.value })
                    }
                    placeholder="Username"
                    className={cn(
                      'bg-background flex-1 rounded-lg border px-3 py-2',
                      'focus:ring-ring text-sm focus:ring-2 focus:outline-hidden'
                    )}
                  />
                  <input
                    type="number"
                    value={newBeneficiary.weight}
                    onChange={(e) =>
                      setNewBeneficiary({
                        ...newBeneficiary,
                        weight: Math.min(
                          100 - totalBeneficiaryWeight,
                          Math.max(1, parseInt(e.target.value) || 1)
                        ),
                      })
                    }
                    min={1}
                    max={100 - totalBeneficiaryWeight}
                    className={cn(
                      'bg-background w-16 rounded-lg border px-3 py-2',
                      'focus:ring-ring text-center text-sm focus:ring-2 focus:outline-hidden'
                    )}
                  />
                  <span className="text-muted-foreground text-sm">%</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBeneficiary}
                    disabled={!newBeneficiary.account.trim()}
                    className="h-9"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <p className="text-muted-foreground text-xs">
                Beneficiaries receive a percentage of your post rewards. The platform takes 5% to
                support development.
              </p>
            </div>
          )}

          {/* Cover Image */}
          <div className="space-y-3">
            <label className="text-foreground text-sm font-medium">Cover Image</label>

            {/* Current cover image */}
            {coverImage && (
              <div className="relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover"
                  className="h-32 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => onCoverImageChange('')}
                  className={cn(
                    'absolute top-2 right-2 rounded-full p-1',
                    'bg-black/50 text-white transition-colors hover:bg-black/70'
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* URL input */}
            <input
              type="text"
              value={coverImage}
              onChange={(e) => onCoverImageChange(e.target.value)}
              placeholder="Enter image URL or select from detected images"
              className={cn(
                'bg-background w-full rounded-lg border px-3 py-2',
                'focus:ring-ring text-sm focus:ring-2 focus:outline-hidden'
              )}
            />

            {/* Detected images from content */}
            {detectedImages.length > 0 && (
              <div className="space-y-2">
                <span className="text-muted-foreground text-xs">Detected images in content:</span>
                <div className="flex flex-wrap gap-2">
                  {detectedImages.slice(0, 4).map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onCoverImageChange(img)}
                      className={cn(
                        'relative h-16 w-16 overflow-hidden rounded-lg border-2',
                        'hover:border-primary transition-all',
                        coverImage === img
                          ? 'border-primary ring-primary/20 ring-2'
                          : 'border-border'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`Detected ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                        }}
                      />
                      {coverImage === img && (
                        <div className="bg-primary/20 absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="text-primary h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
