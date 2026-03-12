import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for TikTok's oEmbed API.
 * Returns thumbnail URL and metadata for a TikTok video.
 * Cached for 1 hour since thumbnail URLs have expiry signatures.
 */
export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  const username = request.nextUrl.searchParams.get('username');

  if (!videoId || !username) {
    return NextResponse.json({ error: 'Missing videoId or username' }, { status: 400 });
  }

  // Validate inputs to prevent SSRF
  if (!/^\d+$/.test(videoId) || !/^[\w.-]+$/.test(username)) {
    return NextResponse.json({ error: 'Invalid videoId or username' }, { status: 400 });
  }

  const tiktokUrl = `https://www.tiktok.com/@${username}/video/${videoId}`;
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`;

  try {
    const res = await fetch(oembedUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'TikTok oEmbed failed' }, { status: 502 });
    }

    const data = await res.json();

    return NextResponse.json({
      title: data.title || '',
      authorName: data.author_name || username,
      thumbnailUrl: data.thumbnail_url || null,
      thumbnailWidth: data.thumbnail_width || 576,
      thumbnailHeight: data.thumbnail_height || 1024,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch TikTok metadata' }, { status: 502 });
  }
}
