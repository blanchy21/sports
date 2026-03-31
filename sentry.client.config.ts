/**
 * Sentry Client Configuration
 *
 * This file configures the Sentry SDK for the browser.
 * It initializes error tracking, performance monitoring, and session replay.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring
  tracesSampleRate: 0.1, // Sample 10% of transactions

  // Session replay for debugging user issues
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors

  // No heavy integrations at init — replay is lazy-loaded below to reduce TTI
  integrations: [],

  // Environment
  environment: process.env.NODE_ENV,

  // Release version (set via CI/CD)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

  // Filter out known non-issues
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors that are user-side
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User abort
    'AbortError',
    'The operation was aborted',
    // Resize observer (benign)
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Browser extension / injected script noise (not from our code)
    /Error invoking.*Method not found/,
    'Failed to connect to MetaMask',
    /reading 'sendMessage'/,
    // Webpack stale chunk errors after deployments (user just needs to refresh)
    /Cannot read properties of undefined \(reading 'call'\)/,
    'Loading chunk',
    /ChunkLoadError/,
  ],

  // Only send errors from our domain
  allowUrls: [
    // Production domain
    /sportsblock\.app/,
    /sportsblock\.vercel\.app/,
    // Local development
    /localhost/,
  ],

  // Before sending an event, you can modify or drop it
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sentry Debug]', hint.originalException || event);
      return null;
    }

    // Filter out chunk load / stale deployment errors
    const error = hint.originalException;
    if (error instanceof Error) {
      if (
        error.message?.includes('Loading chunk') ||
        error.message?.includes("reading 'call'") ||
        error.name === 'ChunkLoadError'
      ) {
        return null;
      }
    }

    return event;
  },
});

// Lazy-load the heavy replay integration after the page is interactive.
// This keeps ~30-40KB of replay SDK out of the critical rendering path.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const schedule = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 3000));
  schedule(() => {
    Sentry.addIntegration(
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      })
    );
  });
}
