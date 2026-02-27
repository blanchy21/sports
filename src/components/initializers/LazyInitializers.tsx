'use client';

import { useEffect, useState } from 'react';
import { ServiceWorkerInitializer } from './ServiceWorkerInitializer';
import { MatchThreadLiveNotifier } from './MatchThreadLiveNotifier';
import { GlobalErrorHandlerInitializer } from '@/components/feedback/GlobalErrorHandlerInitializer';

/**
 * Defers non-critical initializers until after the page has hydrated and
 * become interactive. This keeps them out of the critical rendering path.
 */
export function LazyInitializers() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer initializers until after first paint using requestIdleCallback
    // (falls back to setTimeout for browsers without support)
    const schedule = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    const id = schedule(() => setMounted(true));
    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(id as number);
      }
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <GlobalErrorHandlerInitializer />
      <ServiceWorkerInitializer />
      <MatchThreadLiveNotifier />
    </>
  );
}
