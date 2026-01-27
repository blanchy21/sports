/**
 * Hive Testnet Integration Test Setup
 *
 * This module provides infrastructure for running integration tests against
 * the Hive testnet. Based on patterns from the Hive blockchain's test suite.
 *
 * @see https://github.com/openhive-network/hive/tree/develop/tests
 * @see https://github.com/openhive-network/dhive/tree/master/test
 *
 * Environment Variables:
 *   RUN_HIVE_INTEGRATION_TESTS=true  - Enable integration tests
 *   HIVE_TESTNET_NODE=<url>          - Testnet node URL (optional)
 *   HIVE_TEST_USERNAME=<username>    - Test account username (optional)
 *   HIVE_TEST_POSTING_KEY=<key>      - Test account posting key (optional)
 */

import { PrivateKey } from '@hiveio/dhive';

// ============================================================================
// Configuration
// ============================================================================

export const TESTNET_CONFIG = {
  // Default testnet node - can be overridden with HIVE_TESTNET_NODE env var
  DEFAULT_NODE: 'https://testnet.openhive.network',

  // Alternative testnet nodes for fallback
  FALLBACK_NODES: [
    'https://api.hive.blog', // Mainnet fallback for read-only tests
  ],

  // Test timeout for integration tests (30 seconds)
  TEST_TIMEOUT: 30000,

  // Delay between operations to avoid rate limiting
  OPERATION_DELAY: 1000,
};

// ============================================================================
// Environment Helpers
// ============================================================================

/**
 * Check if integration tests should run
 */
export function shouldRunIntegrationTests(): boolean {
  return process.env.RUN_HIVE_INTEGRATION_TESTS === 'true';
}

/**
 * Get the testnet node URL
 */
export function getTestnetNode(): string {
  return process.env.HIVE_TESTNET_NODE || TESTNET_CONFIG.DEFAULT_NODE;
}

/**
 * Get test credentials if available
 */
export function getTestCredentials(): { username: string; postingKey: string } | null {
  const username = process.env.HIVE_TEST_USERNAME;
  const postingKey = process.env.HIVE_TEST_POSTING_KEY;

  if (!username || !postingKey) {
    return null;
  }

  return { username, postingKey };
}

// ============================================================================
// Test Account Helpers
// ============================================================================

/**
 * Generate deterministic keys from a username and password (like dhive does)
 * This follows Hive's standard key derivation pattern.
 */
export function generateTestKeys(username: string, password: string) {
  return {
    posting: PrivateKey.fromLogin(username, password, 'posting'),
    active: PrivateKey.fromLogin(username, password, 'active'),
    owner: PrivateKey.fromLogin(username, password, 'owner'),
    memo: PrivateKey.fromLogin(username, password, 'memo'),
  };
}

/**
 * Generate a random test username
 */
export function generateTestUsername(prefix = 'sbtest'): string {
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${random}`;
}

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * Well-known test accounts that exist on mainnet for read-only testing
 */
export const KNOWN_TEST_ACCOUNTS = {
  // High-rep accounts that definitely exist
  HIVE_BLOG: 'hive.blog',
  HIVEBUZZ: 'hivebuzz',
  BLOCKTRADES: 'blocktrades',
} as const;

/**
 * Generate a unique permlink for test posts
 */
export function generateTestPermlink(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// ============================================================================
// Skip Helper
// ============================================================================

/**
 * Conditionally skip tests that require testnet access
 */
export function describeIfIntegration(name: string, fn: () => void): void {
  if (shouldRunIntegrationTests()) {
    describe(name, fn);
  } else {
    describe.skip(`[SKIPPED: Set RUN_HIVE_INTEGRATION_TESTS=true] ${name}`, fn);
  }
}

/**
 * Conditionally skip individual tests
 */
export function itIfIntegration(name: string, fn: () => Promise<void>, timeout?: number): void {
  if (shouldRunIntegrationTests()) {
    it(name, fn, timeout || TESTNET_CONFIG.TEST_TIMEOUT);
  } else {
    it.skip(`[SKIPPED] ${name}`, fn);
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a Hive account exists and has valid data
 * Uses `unknown` type to be compatible with dhive's complex ExtendedAccount type
 */
export function assertValidHiveAccount(account: unknown): void {
  expect(account).toBeDefined();
  const acc = account as Record<string, unknown>;
  expect(acc.name).toBeDefined();
  expect(typeof acc.name).toBe('string');
  expect((acc.name as string).length).toBeGreaterThan(0);
}

/**
 * Assert that a Hive post/comment has valid structure
 */
export function assertValidHivePost(post: {
  author?: string;
  permlink?: string;
  title?: string;
  body?: string;
}): void {
  expect(post).toBeDefined();
  expect(post.author).toBeDefined();
  expect(post.permlink).toBeDefined();
  expect(typeof post.author).toBe('string');
  expect(typeof post.permlink).toBe('string');
}
