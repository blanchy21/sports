/**
 * WorkerBee Configuration Management
 * 
 * This module handles all configuration for WorkerBee and Wax integration,
 * including environment variables, node endpoints, and feature flags.
 */

export interface WorkerBeeConfig {
  // Node Configuration
  nodeUrl: string;
  testnetUrl: string;
  devUrl: string;
  
  // WorkerBee Settings
  enabled: boolean;
  debug: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  
  // Wax Settings
  waxEnabled: boolean;
  waxDebug: boolean;
  waxTimeout: number;
  
  // Real-time Features
  realtimeEnabled: boolean;
  blockMonitoring: boolean;
  accountMonitoring: boolean;
  whaleAlerts: boolean;
  
  // Performance
  performanceMonitoring: boolean;
  performanceBenchmarking: boolean;
  performanceLogging: boolean;
  
  // Development
  nodeEnv: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  debugWorkerBee: boolean;
  debugWax: boolean;
  
  // Testing
  testMode: boolean;
  testNodeUrl: string;
  testTimeout: number;
  
  // Error Handling
  errorReporting: boolean;
  errorLogging: boolean;
  fallbackToDhive: boolean;
  
  // Caching
  cacheEnabled: boolean;
  cacheTtl: number;
  cacheMaxSize: number;
  
  // Security
  apiKeyRequired: boolean;
  rateLimiting: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

/**
 * Get WorkerBee configuration from environment variables
 */
export function getWorkerBeeConfig(): WorkerBeeConfig {
  return {
    // Node Configuration
    nodeUrl: process.env.HIVE_NODE_URL || 'https://api.hive.blog',
    testnetUrl: process.env.HIVE_NODE_URL_TESTNET || 'https://testnet.openhive.network',
    devUrl: process.env.HIVE_NODE_URL_DEV || 'https://api.development.hive.io',
    
    // WorkerBee Settings
    enabled: process.env.WORKERBEE_ENABLED === 'true',
    debug: process.env.WORKERBEE_DEBUG === 'true',
    timeout: parseInt(process.env.WORKERBEE_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.WORKERBEE_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.WORKERBEE_RETRY_DELAY || '1000'),
    
    // Wax Settings
    waxEnabled: process.env.WAX_ENABLED === 'true',
    waxDebug: process.env.WAX_DEBUG === 'true',
    waxTimeout: parseInt(process.env.WAX_TIMEOUT || '30000'),
    
    // Real-time Features
    realtimeEnabled: process.env.REALTIME_ENABLED === 'true',
    blockMonitoring: process.env.REALTIME_BLOCK_MONITORING === 'true',
    accountMonitoring: process.env.REALTIME_ACCOUNT_MONITORING === 'true',
    whaleAlerts: process.env.REALTIME_WHALE_ALERTS === 'true',
    
    // Performance
    performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
    performanceBenchmarking: process.env.PERFORMANCE_BENCHMARKING === 'true',
    performanceLogging: process.env.PERFORMANCE_LOGGING === 'true',
    
    // Development
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    debugWorkerBee: process.env.DEBUG_WORKERBEE === 'true',
    debugWax: process.env.DEBUG_WAX === 'true',
    
    // Testing
    testMode: process.env.TEST_MODE === 'true',
    testNodeUrl: process.env.TEST_NODE_URL || 'https://testnet.openhive.network',
    testTimeout: parseInt(process.env.TEST_TIMEOUT || '10000'),
    
    // Error Handling
    errorReporting: process.env.ERROR_REPORTING === 'true',
    errorLogging: process.env.ERROR_LOGGING === 'true',
    fallbackToDhive: process.env.FALLBACK_TO_DHIVE === 'true',
    
    // Caching
    cacheEnabled: process.env.CACHE_ENABLED === 'true',
    cacheTtl: parseInt(process.env.CACHE_TTL || '300000'),
    cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
    
    // Security
    apiKeyRequired: process.env.API_KEY_REQUIRED === 'true',
    rateLimiting: process.env.RATE_LIMITING === 'true',
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  };
}

/**
 * Get the appropriate node URL based on environment
 */
export function getNodeUrl(): string {
  const config = getWorkerBeeConfig();
  
  if (config.testMode) {
    return config.testNodeUrl;
  }
  
  switch (config.nodeEnv) {
    case 'production':
      return config.nodeUrl;
    case 'development':
      return config.devUrl;
    case 'test':
      return config.testnetUrl;
    default:
      return config.nodeUrl;
  }
}

/**
 * Check if WorkerBee features are enabled
 */
export function isWorkerBeeEnabled(): boolean {
  const config = getWorkerBeeConfig();
  return config.enabled && !config.testMode;
}

/**
 * Check if real-time features are enabled
 */
export function isRealtimeEnabled(): boolean {
  const config = getWorkerBeeConfig();
  return config.realtimeEnabled && isWorkerBeeEnabled();
}

/**
 * Check if performance monitoring is enabled
 */
export function isPerformanceMonitoringEnabled(): boolean {
  const config = getWorkerBeeConfig();
  return config.performanceMonitoring;
}

/**
 * Get debug settings for logging
 */
export function getDebugSettings() {
  const config = getWorkerBeeConfig();
  return {
    workerBee: config.debugWorkerBee,
    wax: config.debugWax,
    general: config.debug,
    logLevel: config.logLevel,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const config = getWorkerBeeConfig();
  const errors: string[] = [];
  
  // Validate URLs
  try {
    new URL(config.nodeUrl);
  } catch {
    errors.push('Invalid HIVE_NODE_URL');
  }
  
  try {
    new URL(config.testnetUrl);
  } catch {
    errors.push('Invalid HIVE_NODE_URL_TESTNET');
  }
  
  // Validate numeric values
  if (config.timeout <= 0) {
    errors.push('WORKERBEE_TIMEOUT must be positive');
  }
  
  if (config.retryAttempts < 0) {
    errors.push('WORKERBEE_RETRY_ATTEMPTS must be non-negative');
  }
  
  if (config.retryDelay < 0) {
    errors.push('WORKERBEE_RETRY_DELAY must be non-negative');
  }
  
  if (config.rateLimitRequests <= 0) {
    errors.push('RATE_LIMIT_REQUESTS must be positive');
  }
  
  if (config.rateLimitWindow <= 0) {
    errors.push('RATE_LIMIT_WINDOW must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export default configuration
export const config = getWorkerBeeConfig();
export default config;