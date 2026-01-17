/**
 * Jest global setup - runs before tests are loaded
 * This is the only place we can set up globals before module resolution
 */

import { TextEncoder, TextDecoder } from 'util';

// Ensure globals are available for module resolution phase
// Use any cast to avoid TypeScript type mismatches between Node.js and browser types
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextDecoder = TextDecoder;
}

// For Node.js 18+, Request/Response/Headers should be available globally
// We just need to ensure they're also on the global object Jest uses
if (typeof global.Request === 'undefined' && typeof globalThis.Request !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Request = globalThis.Request;
}
if (typeof global.Response === 'undefined' && typeof globalThis.Response !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Response = globalThis.Response;
}
if (typeof global.Headers === 'undefined' && typeof globalThis.Headers !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Headers = globalThis.Headers;
}

export default async function globalSetup() {
  // This function runs once before all test files
  console.log('[Jest Global Setup] Polyfills applied');
}
