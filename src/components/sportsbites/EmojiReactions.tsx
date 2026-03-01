'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/components/modals/ModalProvider';
import type { ReactionEmoji, ReactionCounts } from '@/lib/hive-workerbee/shared';
import { REACTION_EMOJIS } from '@/lib/hive-workerbee/shared';

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
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync from batch-fetched props (arrive after mount)
  useEffect(() => {
    if (initialCounts) setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    if (initialUserReaction !== undefined) setUserReaction(initialUserReaction);
  }, [initialUserReaction]);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
      setIsOpen(false);

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
    <div
      className={cn('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger button */}
      <button
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-all',
          'text-muted-foreground hover:bg-primary/10 hover:text-primary',
          userReaction && 'text-primary',
          isLoading && 'pointer-events-none opacity-70'
        )}
      >
        {userReaction ? (
          <span className="text-base leading-none">{REACTION_EMOJIS[userReaction]}</span>
        ) : (
          <SmilePlus className="h-4 w-4" />
        )}
        {counts.total > 0 && <span className="font-medium tabular-nums">{counts.total}</span>}
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="absolute bottom-full right-0 z-30 mb-2 animate-fade-in sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
          <div className="flex items-center gap-0.5 rounded-full border bg-card px-2 py-1.5 shadow-lg">
            {EMOJI_ORDER.map((emoji) => {
              const isActive = userReaction === emoji;
              const count = counts[emoji];

              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-all',
                    'hover:scale-125 active:scale-95',
                    isActive && 'bg-primary/10'
                  )}
                  title={emoji}
                >
                  <span className="text-lg leading-none">{REACTION_EMOJIS[emoji]}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-medium tabular-nums',
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
        </div>
      )}
    </div>
  );
}
