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

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text to protect user privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

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
