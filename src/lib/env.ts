/**
 * Environment variable validation and typed access
 * Validates required environment variables at import time
 */

/**
 * Check if we're in production
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Check if we're in development
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if we're in test environment
 */
export const isTest = process.env.NODE_ENV === 'test';

/**
 * Check if we're running on the server
 */
export const isServer = typeof window === 'undefined';

/**
 * Get an optional environment variable
 */
function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value || defaultValue;
}

/**
 * Environment validation has been run
 */
let validationRun = false;

/**
 * Public environment variables (available on client)
 */
export const publicEnv = {
  firebase: {
    apiKey: getOptionalEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getOptionalEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getOptionalEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getOptionalEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getOptionalEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getOptionalEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  },
  debug: {
    notifications: getOptionalEnv('NEXT_PUBLIC_NOTIFICATIONS_DEBUG') === 'true',
    workerbee: getOptionalEnv('NEXT_PUBLIC_WORKERBEE_DEBUG') === 'true',
  },
} as const;

/**
 * Server-only environment variables
 * These should only be accessed in API routes or server components
 */
export const serverEnv = {
  session: {
    secret: getOptionalEnv('SESSION_SECRET'),
  },
  cron: {
    secret: getOptionalEnv('CRON_SECRET'),
  },
  redis: {
    url: getOptionalEnv('REDIS_URL'),
  },
  upstash: {
    redisRestUrl: getOptionalEnv('UPSTASH_REDIS_REST_URL'),
    redisRestToken: getOptionalEnv('UPSTASH_REDIS_REST_TOKEN'),
  },
  hive: {
    nodeUrl: getOptionalEnv('HIVE_NODE_URL', 'https://api.hive.blog'),
    testnetUrl: getOptionalEnv('HIVE_NODE_URL_TESTNET', 'https://testnet.openhive.network'),
  },
  workerbee: {
    enabled: getOptionalEnv('WORKERBEE_ENABLED') === 'true',
    debug: getOptionalEnv('WORKERBEE_DEBUG') === 'true',
    timeout: parseInt(getOptionalEnv('WORKERBEE_TIMEOUT', '30000') || '30000'),
    retryAttempts: parseInt(getOptionalEnv('WORKERBEE_RETRY_ATTEMPTS', '3') || '3'),
    retryDelay: parseInt(getOptionalEnv('WORKERBEE_RETRY_DELAY', '1000') || '1000'),
  },
  wax: {
    enabled: getOptionalEnv('WAX_ENABLED') === 'true',
    debug: getOptionalEnv('WAX_DEBUG') === 'true',
    timeout: parseInt(getOptionalEnv('WAX_TIMEOUT', '30000') || '30000'),
  },
  tenor: {
    apiKey: getOptionalEnv('TENOR_API_KEY'),
  },
  sentry: {
    dsn: getOptionalEnv('NEXT_PUBLIC_SENTRY_DSN'),
  },
} as const;

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    publicEnv.firebase.apiKey &&
    publicEnv.firebase.projectId
  );
}

/**
 * Check if Redis is configured (via REDIS_URL)
 */
export function isRedisConfigured(): boolean {
  return !!serverEnv.redis.url;
}

/**
 * Check if Upstash Redis is configured
 */
export function isUpstashConfigured(): boolean {
  return !!(serverEnv.upstash.redisRestUrl && serverEnv.upstash.redisRestToken);
}

/**
 * Check if any Redis is configured (Upstash or standard)
 */
export function isAnyRedisConfigured(): boolean {
  return isUpstashConfigured() || isRedisConfigured();
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that all required environment variables are set
 * Call this at app startup to fail fast
 */
export function validateEnvironment(): ValidationResult {
  // Only run once
  if (validationRun) {
    return { valid: true, errors: [], warnings: [] };
  }
  validationRun = true;

  const errors: string[] = [];
  const warnings: string[] = [];

  // ========================================
  // REQUIRED in Production
  // ========================================

  if (isProduction) {
    // Session secret is required for secure session encryption
    if (!serverEnv.session.secret) {
      errors.push('SESSION_SECRET is required in production for secure session encryption');
    } else if (serverEnv.session.secret.length < 32) {
      errors.push('SESSION_SECRET must be at least 32 characters');
    }

    // Cron secret is required for scheduled tasks
    if (!serverEnv.cron.secret) {
      errors.push('CRON_SECRET is required in production for scheduled tasks');
    }

    // Redis is strongly recommended for distributed rate limiting
    if (!isUpstashConfigured() && !isRedisConfigured()) {
      warnings.push('No Redis configured (UPSTASH_REDIS_REST_URL or REDIS_URL). Rate limiting will use in-memory storage which does not scale across instances.');
    }
  }

  // ========================================
  // REQUIRED Always (for core functionality)
  // ========================================

  // Firebase is required for authentication
  if (!publicEnv.firebase.apiKey) {
    errors.push('NEXT_PUBLIC_FIREBASE_API_KEY is required for authentication');
  }
  if (!publicEnv.firebase.projectId) {
    errors.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required for authentication');
  }
  if (!publicEnv.firebase.authDomain) {
    errors.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required for authentication');
  }

  // ========================================
  // OPTIONAL but Recommended
  // ========================================

  if (!serverEnv.tenor.apiKey) {
    warnings.push('TENOR_API_KEY not configured. GIF picker will not work.');
  }

  if (!serverEnv.sentry.dsn) {
    warnings.push('NEXT_PUBLIC_SENTRY_DSN not configured. Error tracking is disabled.');
  }

  // ========================================
  // Log results
  // ========================================

  if (errors.length > 0) {
    console.error('\n========================================');
    console.error('ENVIRONMENT VALIDATION FAILED');
    console.error('========================================');
    errors.forEach((err) => console.error(`  ERROR: ${err}`));
    console.error('========================================\n');
  }

  if (warnings.length > 0 && !isTest) {
    console.warn('\n----------------------------------------');
    console.warn('Environment Warnings:');
    console.warn('----------------------------------------');
    warnings.forEach((warn) => console.warn(`  WARN: ${warn}`));
    console.warn('----------------------------------------\n');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Assert environment is valid, throw if not
 * Use this at app startup to fail fast
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();
  if (!result.valid) {
    throw new Error(
      `Environment validation failed:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}
