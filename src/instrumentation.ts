/**
 * Instrumentation file for Next.js
 *
 * This file is used to initialize monitoring tools like Sentry
 * before the application starts.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import Sentry server config on Node.js runtime
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import Sentry edge config on Edge runtime
    await import('../sentry.edge.config');
  }
}
