'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/components/modals/ModalProvider';
import type { PollDefinition, PollResults } from '@/lib/hive-workerbee/sportsbites';
import { BarChart3 } from 'lucide-react';

interface QuickPollProps {
  sportsbiteId: string;
  poll: PollDefinition;
  initialResults?: PollResults;
  initialUserVote?: 0 | 1 | null;
  className?: string;
}

const DEFAULT_RESULTS: PollResults = {
  option0Count: 0,
  option1Count: 0,
  totalVotes: 0,
};

export function QuickPoll({
  sportsbiteId,
  poll,
  initialResults,
  initialUserVote = null,
  className,
}: QuickPollProps) {
  const { isAuthenticated } = useAuth();
  const { openModal } = useModal();
  const [results, setResults] = useState<PollResults>(initialResults || DEFAULT_RESULTS);
  const [userVote, setUserVote] = useState<0 | 1 | null>(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  const hasVoted = userVote !== null;

  const handleVote = useCallback(
    async (option: 0 | 1) => {
      if (!isAuthenticated) {
        openModal('keychainLogin');
        return;
      }
      if (isLoading) return;

      // Optimistic update
      const prevResults = { ...results };
      const prevVote = userVote;

      const newResults = { ...results };
      if (userVote === option) {
        // Already voted for this — no-op
        return;
      } else if (userVote !== null) {
        // Changing vote
        const prevKey = userVote === 0 ? 'option0Count' : 'option1Count';
        const newKey = option === 0 ? 'option0Count' : 'option1Count';
        newResults[prevKey] = Math.max(0, newResults[prevKey] - 1);
        newResults[newKey] = newResults[newKey] + 1;
      } else {
        // New vote
        const key = option === 0 ? 'option0Count' : 'option1Count';
        newResults[key] = newResults[key] + 1;
        newResults.totalVotes = newResults.totalVotes + 1;
      }

      setResults(newResults);
      setUserVote(option);

      setIsLoading(true);
      try {
        const response = await fetch('/api/soft/poll-votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sportsbiteId, option }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to vote');
        }

        // Use server-authoritative results
        setResults(data.results);
        setUserVote(data.userVote);
      } catch {
        // Rollback on error
        setResults(prevResults);
        setUserVote(prevVote);
      } finally {
        setIsLoading(false);
      }
    },
    [sportsbiteId, results, userVote, isAuthenticated, isLoading, openModal]
  );

  const getPercentage = (count: number) => {
    if (results.totalVotes === 0) return 0;
    return Math.round((count / results.totalVotes) * 100);
  };

  const pct0 = getPercentage(results.option0Count);
  const pct1 = getPercentage(results.option1Count);

  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-medium">{poll.question}</span>
      </div>

      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const optionIndex = index as 0 | 1;
          const pct = optionIndex === 0 ? pct0 : pct1;
          const isSelected = userVote === optionIndex;

          if (!hasVoted) {
            // Pre-vote: selectable buttons
            return (
              <button
                key={index}
                onClick={() => handleVote(optionIndex)}
                disabled={isLoading}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all',
                  'hover:border-primary/50 hover:bg-primary/5',
                  'active:scale-[0.99]',
                  isLoading && 'pointer-events-none opacity-70'
                )}
              >
                {option}
              </button>
            );
          }

          // Post-vote: bar chart
          return (
            <button
              key={index}
              onClick={() => handleVote(optionIndex)}
              disabled={isLoading}
              className={cn(
                'relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left transition-all',
                isSelected ? 'border-primary/40' : 'border-transparent',
                isLoading && 'pointer-events-none opacity-70'
              )}
            >
              {/* Bar fill */}
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-lg transition-all duration-500',
                  isSelected ? 'bg-primary/15' : 'bg-muted/50'
                )}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className={cn('text-sm', isSelected ? 'font-semibold' : 'font-medium')}>
                  {option}
                </span>
                <span
                  className={cn(
                    'text-sm tabular-nums',
                    isSelected ? 'font-semibold text-primary' : 'text-muted-foreground'
                  )}
                >
                  {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {results.totalVotes > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {results.totalVotes} {results.totalVotes === 1 ? 'vote' : 'votes'}
        </p>
      )}
    </div>
  );
}
