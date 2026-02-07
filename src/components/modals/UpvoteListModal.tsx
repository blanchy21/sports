'use client';

import React from 'react';
import { Avatar } from '@/components/core/Avatar';
import { Heart, TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/utils/client';
import { BaseModal } from '@/components/core/BaseModal';

interface UpvoteListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

interface Vote {
  voter: string;
  weight: number;
  rshares: string;
  percent: number;
  reputation: string;
  time: string;
}

export const UpvoteListModal: React.FC<UpvoteListModalProps> = ({ isOpen, onClose, data }) => {
  // Use data if available, otherwise fall back to mock data
  // In a real implementation, this would fetch from Hive API using the data parameter
  const votes: Vote[] = (data?.votes as Vote[]) || [
    {
      voter: 'sportsblock',
      weight: 10000,
      rshares: '1000000000',
      percent: 100,
      reputation: '75',
      time: '2024-01-15T10:30:00.000Z',
    },
    {
      voter: 'footballfan1',
      weight: 5000,
      rshares: '500000000',
      percent: 50,
      reputation: '60',
      time: '2024-01-15T11:15:00.000Z',
    },
    {
      voter: 'basketballfan2',
      weight: 2500,
      rshares: '250000000',
      percent: 25,
      reputation: '45',
      time: '2024-01-15T12:00:00.000Z',
    },
  ];

  const totalVotes = votes.length;
  const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-red-500" />
          <span>Upvotes</span>
          <span className="text-sm text-muted-foreground">({totalVotes})</span>
        </div>
      }
      size="md"
      className="flex max-h-[80vh] flex-col"
    >
      {/* Stats */}
      <div className="border-b bg-muted/30 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-xl font-bold text-red-500 sm:text-2xl">{totalVotes}</div>
            <div className="text-sm text-muted-foreground">Total Votes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold sm:text-2xl">{totalWeight / 100}%</div>
            <div className="text-sm text-muted-foreground">Total Weight</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {votes.length > 0 ? (
          <div className="space-y-4">
            {votes.map((vote, index) => (
              <div key={`${vote.voter}-${vote.time}`} className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Avatar fallback={vote.voter} alt={vote.voter} size="sm" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">@{vote.voter}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(vote.time))}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{vote.percent}% weight</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Rep: {vote.reputation}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-red-500">{vote.weight / 100}%</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">💔</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              No Upvotes Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              This post hasn&apos;t received any upvotes yet.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
