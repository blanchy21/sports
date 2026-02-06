/**
 * Hive node endpoints — single source of truth.
 *
 * Optimized for reliability and speed.
 * arcange.eu excluded due to consistent timeout issues in production.
 *
 * Imported by client.ts, broadcast.ts, api.ts, etc.
 * Kept in its own file to avoid pulling in WASM dependencies.
 */
export const HIVE_NODES = [
  'https://api.hive.blog', // @blocktrades - most reliable
  'https://api.openhive.network', // @gtg - established node
  'https://api.deathwing.me', // @deathwing - backup node
  'https://api.c0ff33a.uk', // @c0ff33a - backup node
];
