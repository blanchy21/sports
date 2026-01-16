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
 * Get an optional environment variable
 */
function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value || defaultValue;
}

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

/**
 * Validate that all required environment variables are set
 * Call this at app startup to fail fast
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check Firebase config if auth features are used
  if (!publicEnv.firebase.apiKey) {
    missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  }
  if (!publicEnv.firebase.projectId) {
    missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
