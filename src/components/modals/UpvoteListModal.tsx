'use client';

import React, { useState, useEffect } from 'react';
import { Avatar } from '@/components/core/Avatar';
import { Heart, TrendingUp, Loader2 } from 'lucide-react';
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
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const author = data?.author as string | undefined;
  const permlink = data?.permlink as string | undefined;

  useEffect(() => {
    if (!isOpen || !author || !permlink) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `/api/hive/votes?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch votes (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const fetched: Vote[] = json.votes || [];
        // Sort by rshares descending (most valuable votes first)
        fetched.sort(
          (a, b) =>
            Math.abs(Number(b.rshares || b.weight)) - Math.abs(Number(a.rshares || a.weight))
        );
        setVotes(fetched);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, author, permlink]);

  const totalVotes = votes.length;
  const totalPercent = votes.reduce((sum, vote) => sum + Math.abs(vote.percent), 0);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-destructive" />
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
            <div className="text-xl font-bold text-destructive sm:text-2xl">{totalVotes}</div>
            <div className="text-sm text-muted-foreground">Total Votes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold sm:text-2xl">
              {totalVotes > 0 ? (totalPercent / totalVotes / 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Weight</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : votes.length > 0 ? (
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
                      <span className="text-xs text-muted-foreground">
                        {(vote.percent / 100).toFixed(0)}% weight
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-destructive">
                    {(vote.percent / 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">💔</div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">No Upvotes Yet</h3>
            <p className="text-muted-foreground">This post hasn&apos;t received any upvotes yet.</p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
