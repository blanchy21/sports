"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Heart, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BaseModal } from "@/components/ui/BaseModal";

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
  // For now, we'll use mock data since we don't have a direct API for fetching voters
  // In a real implementation, this would fetch from Hive API
  const mockVotes: Vote[] = [
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

  const totalVotes = mockVotes.length;
  const totalWeight = mockVotes.reduce((sum, vote) => sum + vote.weight, 0);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-red-500" />
          <span>Upvotes</span>
          <span className="text-sm text-muted-foreground">
            ({totalVotes})
          </span>
        </div>
      }
      size="md"
      className="max-h-[80vh] flex flex-col"
    >
      {/* Stats */}
      <div className="p-6 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{totalVotes}</div>
            <div className="text-sm text-muted-foreground">Total Votes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalWeight / 100}%</div>
            <div className="text-sm text-muted-foreground">Total Weight</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
          {mockVotes.length > 0 ? (
            <div className="space-y-4">
              {mockVotes.map((vote, index) => (
                <div key={`${vote.voter}-${vote.time}`} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <Avatar
                      fallback={vote.voter}
                      alt={vote.voter}
                      size="sm"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">@{vote.voter}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(new Date(vote.time))}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {vote.percent}% weight
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rep: {vote.reputation}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-500">
                      {vote.weight / 100}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Upvotes Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                This post hasn't received any upvotes yet.
              </p>
            </div>
          )}
        </div>
    </BaseModal>
  );
};
