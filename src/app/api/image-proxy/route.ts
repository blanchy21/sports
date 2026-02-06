import { NextRequest, NextResponse } from 'next/server';
import { imageProxyQuerySchema, parseSearchParams } from '@/lib/api/validation';
import {
  createRequestContext,
  validationError,
  forbiddenError,
  timeoutError,
  internalError,
} from '@/lib/api/response';

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
 * Security: Only allows specific trusted domains
 */
const ALLOWED_DOMAINS = [
  'files.peakd.com',
  'files.ecency.com',
  'files.3speak.tv',
  'files.dtube.tv',
  'cdn.steemitimages.com',
  'steemitimages.com',
  'images.hive.blog',
  'gateway.ipfs.io',
  'ipfs.io',
  'images.unsplash.com',
];

function isAllowedDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

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

  try {
    ctx.log.debug('Proxying image', { imageUrl });

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Sportsblock/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      ctx.log.warn('Image fetch failed', { imageUrl, status: response.status });
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    // Validate response is actually an image
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      ctx.log.warn('Non-image content type from proxy', { imageUrl, contentType });
      return forbiddenError('URL does not point to an image', ctx.requestId);
    }

    // Get the image data with size limit (50MB max)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
      ctx.log.warn('Image too large for proxy', { imageUrl, contentLength });
      return forbiddenError('Image too large', ctx.requestId);
    }

    const imageBuffer = await response.arrayBuffer();

    // Return the image with proper CORS headers
    // Restrict CORS to app domain only (prevents abuse from malicious sites)
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
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
