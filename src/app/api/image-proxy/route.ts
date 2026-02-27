import dns from 'node:dns/promises';
import { NextRequest, NextResponse } from 'next/server';
import { imageProxyQuerySchema, parseSearchParams } from '@/lib/api/validation';
import {
  createRequestContext,
  validationError,
  forbiddenError,
  timeoutError,
  internalError,
} from '@/lib/api/response';
import { PROXY_ALLOWED_HOSTS } from '@/lib/constants/image-hosts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/image-proxy';

/**
 * Image Proxy API Route
 *
 * Proxies images from external sources (like files.peakd.com) to avoid CORS issues.
 *
 * Usage: /api/image-proxy?url=https://files.peakd.com/...
 *
 * Security: Only allows specific trusted domains. Validates DNS resolution
 * against private IP ranges to prevent SSRF attacks.
 */

function isAllowedDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return PROXY_ALLOWED_HOSTS.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Check if an IPv4 address belongs to a private/reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true; // invalid = blocked
  const [a, b] = parts;
  return (
    a === 127 || // 127.0.0.0/8  (loopback)
    a === 10 || // 10.0.0.0/8   (private)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 (private)
    (a === 192 && b === 168) || // 192.168.0.0/16 (private)
    (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
    (a === 0 && b === 0) // 0.0.0.0       (unspecified)
  );
}

/**
 * Check if an IPv6 address belongs to a private/reserved range.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (
    normalized === '::1' || // loopback
    normalized === '::' || // unspecified
    normalized.startsWith('fc') || // fc00::/7 (unique local)
    normalized.startsWith('fd') || // fc00::/7 (unique local)
    normalized.startsWith('fe80') // fe80::/10 (link-local)
  ) {
    return true;
  }
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — check the embedded IPv4
  if (normalized.startsWith('::ffff:')) {
    return isPrivateIPv4(normalized.slice(7));
  }
  return false;
}

/**
 * Resolve hostname and verify none of its IPs (IPv4 + IPv6) are private/reserved.
 * Returns an error message string if blocked, or null if safe.
 */
async function validateHostnameIPs(hostname: string): Promise<string | null> {
  try {
    const [ipv4Result, ipv6Result] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname),
    ]);

    const allAddresses: string[] = [];
    if (ipv4Result.status === 'fulfilled') allAddresses.push(...ipv4Result.value);
    if (ipv6Result.status === 'fulfilled') allAddresses.push(...ipv6Result.value);

    if (allAddresses.length === 0) {
      return `Could not resolve hostname: ${hostname}`;
    }

    for (const ip of allAddresses) {
      if (ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) {
        return `Hostname resolves to private IP`;
      }
    }
    return null;
  } catch {
    return `Could not resolve hostname: ${hostname}`;
  }
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Read an image response, validate content type/size, and return proxied response.
 */
async function processImageResponse(
  response: Response,
  imageUrl: string,
  ctx: ReturnType<typeof createRequestContext>
): Promise<NextResponse> {
  // Validate response is actually an image
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    ctx.log.warn('Non-image content type from proxy', { imageUrl, contentType });
    return forbiddenError('URL does not point to an image', ctx.requestId) as NextResponse;
  }

  // Block SVGs — they can contain embedded JavaScript
  if (contentType.includes('image/svg+xml')) {
    ctx.log.warn('Blocked SVG from proxy', { imageUrl, contentType });
    return forbiddenError('SVG images are not allowed', ctx.requestId) as NextResponse;
  }

  // Enforce size limit via Content-Length header
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
    ctx.log.warn('Image too large for proxy', { imageUrl, contentLength });
    return forbiddenError('Image too large', ctx.requestId) as NextResponse;
  }

  // Stream body with hard size limit (Content-Length can be spoofed)
  const reader = response.body?.getReader();
  if (!reader) {
    return internalError('No response body', ctx.requestId) as NextResponse;
  }
  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_IMAGE_SIZE) {
        reader.cancel();
        ctx.log.warn('Image exceeded streaming size limit', { imageUrl, totalSize });
        return forbiddenError('Image too large', ctx.requestId) as NextResponse;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const imageBuffer = Buffer.concat(chunks);

  // Return the image with proper CORS headers
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return new NextResponse(imageBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  // Block external abuse: only allow requests from our own origin
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (referer || origin) {
    const source = referer || origin || '';
    try {
      const sourceHost = new URL(source).host;
      if (host && sourceHost !== host) {
        ctx.log.warn('Image proxy blocked: external origin', { source, host });
        return forbiddenError('Image proxy is not available for external use', ctx.requestId);
      }
    } catch {
      // Malformed referer/origin — allow through (could be direct browser request)
    }
  }

  // Validate query parameters
  const parseResult = parseSearchParams(request.nextUrl.searchParams, imageProxyQuerySchema);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { url: imageUrl } = parseResult.data;

  // Validate domain whitelist
  if (!isAllowedDomain(imageUrl)) {
    ctx.log.warn('Blocked image proxy request', { imageUrl, reason: 'domain_not_allowed' });
    return forbiddenError('Image URL domain not allowed', ctx.requestId);
  }

  // SSRF protection: resolve hostname and block private IPs before fetching
  try {
    const parsed = new URL(imageUrl);
    const dnsError = await validateHostnameIPs(parsed.hostname);
    if (dnsError) {
      ctx.log.warn('Image proxy SSRF block', { imageUrl, reason: dnsError });
      return forbiddenError(dnsError, ctx.requestId);
    }
  } catch {
    return validationError('Invalid image URL', ctx.requestId);
  }

  try {
    ctx.log.debug('Proxying image', { imageUrl });

    // Fetch the image (manual redirect to prevent SSRF via redirect to private IPs)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Sportsblock/1.0)',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    // If redirect, validate the target domain is still allowed
    if (response.status >= 300 && response.status < 400) {
      const rawLocation = response.headers.get('location');
      // Resolve relative redirects (e.g. /p/...) against the original URL
      const location = rawLocation ? new URL(rawLocation, imageUrl).toString() : null;
      if (!location || !isAllowedDomain(location)) {
        ctx.log.warn('Image proxy blocked redirect to disallowed domain', {
          imageUrl,
          redirectTo: location,
        });
        return forbiddenError('Image redirect to disallowed domain', ctx.requestId);
      }
      // SSRF check on redirect target too
      try {
        const redirectParsed = new URL(location);
        const redirectDnsError = await validateHostnameIPs(redirectParsed.hostname);
        if (redirectDnsError) {
          ctx.log.warn('Image proxy SSRF block on redirect', {
            imageUrl,
            redirectTo: location,
            reason: redirectDnsError,
          });
          return forbiddenError(redirectDnsError, ctx.requestId);
        }
      } catch {
        return forbiddenError('Invalid redirect URL', ctx.requestId);
      }
      // Re-fetch from the validated redirect target
      const redirectResponse = await fetch(location, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sportsblock/1.0)' },
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });
      if (redirectResponse.status >= 300) {
        return forbiddenError('Too many redirects', ctx.requestId);
      }
      return processImageResponse(redirectResponse, imageUrl, ctx);
    }

    if (!response.ok) {
      ctx.log.warn('Image fetch failed', { imageUrl, status: response.status });
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    return processImageResponse(response, imageUrl, ctx);
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      ctx.log.warn('Image proxy timeout', { imageUrl });
      return timeoutError('Image request timed out', ctx.requestId);
    }

    ctx.log.error('Image proxy error', error, { imageUrl });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return internalError(`Failed to proxy image: ${message}`, ctx.requestId);
  }
}
