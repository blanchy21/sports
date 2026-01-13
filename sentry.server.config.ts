/**
 * Sentry Server Configuration
 *
 * This file configures the Sentry SDK for the server-side (Node.js).
 * It tracks errors and performance on API routes and server components.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring (lower sample rate on server)
  tracesSampleRate: 0.05, // Sample 5% of transactions

  // Environment
  environment: process.env.NODE_ENV,

  // Release version (set via CI/CD)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

  // Filter out known non-issues
  ignoreErrors: [
    // Network errors from Hive nodes
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'socket hang up',
    // Expected errors
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // Before sending, modify or drop events
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sentry Server Debug]', hint.originalException || event);
      return null;
    }

    const error = hint.originalException;
    if (error instanceof Error) {
      // Skip Hive node connection errors (handled by retry logic)
      if (
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT')
      ) {
        return null;
      }
    }

    return event;
  },
});
