'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Navigation Progress Bar
 *
 * A minimal, safe progress bar that shows during route transitions.
 * Uses pathname changes to detect navigation completion.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPending] = useTransition();

  // Reset and complete progress when pathname changes
  useEffect(() => {
    // Complete the progress bar
    setProgress(100);

    // Hide after animation completes
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 300);

    return () => clearTimeout(hideTimer);
  }, [pathname]);

  // Show progress bar when React transition is pending
  useEffect(() => {
    if (isPending) {
      setIsVisible(true);
      setProgress(30);

      // Gradually increase progress
      const timer = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 200);

      return () => clearInterval(timer);
    }
  }, [isPending]);

  // Listen for link clicks to start progress immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (!link) return;

      const href = link.getAttribute('href');

      // Skip if no href, external link, anchor, or same page
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        link.target === '_blank' ||
        href === pathname
      ) {
        return;
      }

      // Start the progress bar immediately
      setIsVisible(true);
      setProgress(20);
    };

    // Use capture phase to catch clicks early
    document.addEventListener('click', handleClick, { capture: true, passive: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [pathname]);

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed top-0 right-0 left-0 z-9999 h-1"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="from-primary to-accent shadow-primary/30 h-full bg-linear-to-r shadow-lg"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          transition:
            progress >= 100
              ? 'width 150ms ease-out, opacity 200ms ease-out 100ms'
              : 'width 150ms ease-out',
        }}
      />
    </div>
  );
}
