/**
 * Metrics Tracking Hooks
 *
 * React hooks for client-side metrics tracking.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Track a post view when the component mounts
 *
 * @param author - Post author
 * @param permlink - Post permlink
 * @param options - Additional tracking options
 */
export function useTrackPostView(
  author: string | undefined,
  permlink: string | undefined,
  options: {
    enabled?: boolean;
    onlyOnce?: boolean;
  } = {}
) {
  const { user } = useAuth();
  const hasTracked = useRef(false);
  const { enabled = true, onlyOnce = true } = options;

  useEffect(() => {
    if (!enabled || !author || !permlink) return;
    if (onlyOnce && hasTracked.current) return;

    const trackView = async () => {
      try {
        await fetch('/api/metrics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'view',
            author,
            permlink,
            viewerAccount: user?.username,
            referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          }),
        });
        hasTracked.current = true;
      } catch (error) {
        // Silently fail - don't disrupt UX
        console.debug('Failed to track view:', error);
      }
    };

    trackView();
  }, [author, permlink, user?.username, enabled, onlyOnce]);
}

/**
 * Returns a function to track engagement events
 */
export function useTrackEngagement() {
  const { user } = useAuth();

  const trackEvent = useCallback(
    async (
      type: 'view' | 'vote' | 'comment' | 'share',
      author: string,
      permlink: string
    ) => {
      try {
        await fetch('/api/metrics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            author,
            permlink,
            viewerAccount: user?.username,
            referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          }),
        });
      } catch (error) {
        console.debug('Failed to track engagement:', error);
      }
    },
    [user?.username]
  );

  const trackVote = useCallback(
    (author: string, permlink: string) => trackEvent('vote', author, permlink),
    [trackEvent]
  );

  const trackComment = useCallback(
    (author: string, permlink: string) => trackEvent('comment', author, permlink),
    [trackEvent]
  );

  const trackShare = useCallback(
    (author: string, permlink: string) => trackEvent('share', author, permlink),
    [trackEvent]
  );

  return {
    trackEvent,
    trackVote,
    trackComment,
    trackShare,
  };
}

/**
 * Hook to fetch and cache leaderboard data
 */
export function useLeaderboard(weekId?: string, category?: string) {
  // This would typically use React Query, but keeping it simple
  // The actual implementation should use the existing React Query setup
  return {
    data: null,
    isLoading: false,
    error: null,
  };
}
