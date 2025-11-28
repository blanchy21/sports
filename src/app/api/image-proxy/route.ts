import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_DOMAINS.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  // Validate URL
  if (!isValidImageUrl(imageUrl)) {
    return NextResponse.json(
      { error: 'Invalid image URL domain' },
      { status: 403 }
    );
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Sportsblock/1.0)',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[Image Proxy] Error fetching image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle timeout
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: `Failed to proxy image: ${message}` },
      { status: 500 }
    );
  }
}

