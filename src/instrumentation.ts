/**
 * Instrumentation file for Next.js
 *
 * This file is used to:
 * 1. Validate environment variables at startup
 * 2. Initialize monitoring tools like Sentry
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('\n========================================');
    console.log('[Sportsblock] Server Initialization');
    console.log('========================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`NEXT_RUNTIME: ${process.env.NEXT_RUNTIME}`);
    console.log('----------------------------------------\n');

    // Validate environment variables first
    const { assertValidEnvironment, isProduction, isDevelopment, publicEnv, serverEnv } = await import('@/lib/env');

    const mode = isProduction ? 'PRODUCTION' : isDevelopment ? 'DEVELOPMENT' : 'TEST';
    console.log(`[Sportsblock] Starting server in ${mode} mode...\n`);

    // Log environment variable status (not values for security)
    console.log('[Sportsblock] Environment Variables Status:');
    console.log(`  - NEXT_PUBLIC_FIREBASE_API_KEY: ${publicEnv.firebase.apiKey ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${publicEnv.firebase.projectId ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${publicEnv.firebase.authDomain ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - SESSION_SECRET: ${serverEnv.session.secret ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - CRON_SECRET: ${serverEnv.cron.secret ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - NEXT_PUBLIC_SENTRY_DSN: ${serverEnv.sentry.dsn ? '✓ Set' : '✗ Missing'}`);
    console.log('');

    try {
      assertValidEnvironment();
      console.log('[Sportsblock] Environment validation passed ✓\n');
    } catch (error) {
      console.error('[Sportsblock] Environment validation FAILED:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

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
    try {
      await import('../sentry.server.config');
      console.log('[Sportsblock] Sentry initialized ✓\n');
    } catch (sentryError) {
      console.warn('[Sportsblock] Sentry initialization failed:', sentryError);
    }

    console.log('========================================');
    console.log('[Sportsblock] Server Ready');
    console.log('========================================\n');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import Sentry edge config on Edge runtime
    await import('../sentry.edge.config');
  }
}
