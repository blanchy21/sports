import { useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  /** Throttle interval in ms (default: 150ms) */
  throttleMs?: number;
}

export const useInfiniteScroll = ({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200,
  throttleMs = 150,
}: UseInfiniteScrollOptions) => {
  const lastCallRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (isLoading || !hasMore) return;

    const now = Date.now();

    // Throttle: skip if called too recently
    if (now - lastCallRef.current < throttleMs) {
      return;
    }
    lastCallRef.current = now;

    // Use requestAnimationFrame for smooth performance
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Check if user has scrolled to within threshold of the bottom
      if (scrollTop + windowHeight >= documentHeight - threshold) {
        onLoadMore();
      }
    });
  }, [isLoading, hasMore, onLoadMore, threshold, throttleMs]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll]);
};
