/**
 * Instrumentation file for Next.js
 *
 * This file is used to:
 * 1. Validate environment variables at startup
 * 2. Initialize monitoring tools like Sentry
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables first
    const { assertValidEnvironment, isProduction, isDevelopment } = await import('@/lib/env');

    const mode = isProduction ? 'PRODUCTION' : isDevelopment ? 'DEVELOPMENT' : 'TEST';
    console.log(`\n[Sportsblock] Starting server in ${mode} mode...\n`);

    try {
      assertValidEnvironment();
      console.log('[Sportsblock] Environment validation passed\n');
    } catch (error) {
      if (isProduction) {
        // In production, fail fast - don't start with missing critical config
        console.error('[Sportsblock] FATAL: Environment validation failed. Server cannot start.');
        throw error;
      } else {
        // In development, warn but continue
        console.warn('[Sportsblock] Environment validation issues (continuing in dev mode)');
        console.warn(error instanceof Error ? error.message : String(error));
        console.warn('');
      }
    }

    // Import Sentry server config on Node.js runtime
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import Sentry edge config on Edge runtime
    await import('../sentry.edge.config');
  }
}
