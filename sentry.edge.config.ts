/**
 * Sentry Edge Configuration
 *
 * This file configures the Sentry SDK for Edge runtime (middleware).
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Lower sample rate for edge functions
  tracesSampleRate: 0.05,

  // Environment
  environment: process.env.NODE_ENV,

  // Release version
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',
});
