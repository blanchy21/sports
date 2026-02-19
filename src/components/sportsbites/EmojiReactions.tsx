'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/components/modals/ModalProvider';
import type { ReactionEmoji, ReactionCounts } from '@/lib/hive-workerbee/sportsbites';
import { REACTION_EMOJIS } from '@/lib/hive-workerbee/sportsbites';

interface EmojiReactionsProps {
  sportsbiteId: string;
  initialCounts?: ReactionCounts;
  initialUserReaction?: ReactionEmoji | null;
  className?: string;
}

const EMOJI_ORDER: ReactionEmoji[] = [
  'fire',
  'shocked',
  'laughing',
  'angry',
  'eyes',
  'thumbs_down',
];

const DEFAULT_COUNTS: ReactionCounts = {
  fire: 0,
  shocked: 0,
  laughing: 0,
  angry: 0,
  eyes: 0,
  thumbs_down: 0,
  total: 0,
};

export function EmojiReactions({
  sportsbiteId,
  initialCounts,
  initialUserReaction = null,
  className,
}: EmojiReactionsProps) {
  const { isAuthenticated } = useAuth();
  const { openModal } = useModal();
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts || DEFAULT_COUNTS);
  const [userReaction, setUserReaction] = useState<ReactionEmoji | null>(initialUserReaction);
  const [isLoading, setIsLoading] = useState(false);

  // Sync from batch-fetched props (arrive after mount)
  useEffect(() => {
    if (initialCounts) setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    if (initialUserReaction !== undefined) setUserReaction(initialUserReaction);
  }, [initialUserReaction]);

  const handleReact = useCallback(
    async (emoji: ReactionEmoji) => {
      if (!isAuthenticated) {
        openModal('keychainLogin');
        return;
      }
      if (isLoading) return;

      // Optimistic update
      const prevCounts = { ...counts };
      const prevReaction = userReaction;

      const newCounts = { ...counts };
      if (userReaction === emoji) {
        // Remove reaction
        newCounts[emoji] = Math.max(0, newCounts[emoji] - 1);
        newCounts.total = Math.max(0, newCounts.total - 1);
        setUserReaction(null);
      } else if (userReaction) {
        // Swap reaction
        newCounts[userReaction] = Math.max(0, newCounts[userReaction] - 1);
        newCounts[emoji] = newCounts[emoji] + 1;
        setUserReaction(emoji);
      } else {
        // Add reaction
        newCounts[emoji] = newCounts[emoji] + 1;
        newCounts.total = newCounts.total + 1;
        setUserReaction(emoji);
      }
      setCounts(newCounts);

      setIsLoading(true);
      try {
        const response = await fetch('/api/soft/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sportsbiteId, emoji }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to react');
        }

        // Use server-authoritative counts
        setCounts(data.counts);
        setUserReaction(data.userReaction);
      } catch {
        // Rollback on error
        setCounts(prevCounts);
        setUserReaction(prevReaction);
      } finally {
        setIsLoading(false);
      }
    },
    [sportsbiteId, counts, userReaction, isAuthenticated, isLoading, openModal]
  );

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {EMOJI_ORDER.map((emoji) => {
        const count = counts[emoji];
        const isActive = userReaction === emoji;

        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-all',
              'hover:bg-muted active:scale-95',
              isActive ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-transparent',
              isLoading && 'pointer-events-none opacity-70'
            )}
            title={emoji}
          >
            <span className="text-sm">{REACTION_EMOJIS[emoji]}</span>
            {count > 0 && (
              <span
                className={cn(
                  'font-medium tabular-nums',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
