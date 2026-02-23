/**
 * Shared image host constants
 *
 * Single source of truth for trusted image hostnames used across
 * sanitization (sanitize.ts) and the image proxy route.
 */

/**
 * Full list of trusted image hostnames.
 * Used by sanitize.ts for image URL validation and trusted-host checks.
 *
 * Union of all known image hosts across the codebase:
 * - Hive ecosystem (images.hive.blog, ecency, peakd, steemitimages, 3speak, dtube)
 * - IPFS gateways
 * - General image hosts (imgur, unsplash, tenor, giphy, twimg)
 */
export const TRUSTED_IMAGE_HOSTS = [
  // Hive ecosystem
  'images.hive.blog',
  'images.ecency.com',
  'files.peakd.com',
  'files.ecency.com',
  'cdn.steemitimages.com',
  'steemitimages.com',
  'files.3speak.tv',
  'files.dtube.tv',
  // IPFS gateways
  'gateway.ipfs.io',
  'ipfs.io',
  // General image hosts
  'images.unsplash.com',
  'i.imgur.com',
  'imgur.com',
  'media.tenor.com',
  'media1.tenor.com',
  'c.tenor.com',
  'pbs.twimg.com',
  'media.giphy.com',
] as const;

/**
 * Set version of TRUSTED_IMAGE_HOSTS for O(1) lookups.
 */
export const TRUSTED_IMAGE_HOSTS_SET = new Set<string>(TRUSTED_IMAGE_HOSTS);

/**
 * Subset of trusted hosts allowed through the image proxy.
 * More restrictive — only hosts we're willing to proxy/re-serve.
 * Does not include third-party hosts (imgur, tenor, giphy, twimg)
 * that already serve proper CORS headers.
 */
export const PROXY_ALLOWED_HOSTS = [
  'files.peakd.com',
  'files.ecency.com',
  'files.3speak.tv',
  'files.dtube.tv',
  'cdn.steemitimages.com',
  'steemitimages.com',
  'images.hive.blog',
  'images.ecency.com',
  'gateway.ipfs.io',
  'ipfs.io',
  'images.unsplash.com',
] as const;

/**
 * Set version of PROXY_ALLOWED_HOSTS for O(1) lookups.
 */
export const PROXY_ALLOWED_HOSTS_SET = new Set<string>(PROXY_ALLOWED_HOSTS);
