'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface TikTokEmbedProps {
  videoId: string;
  username: string;
}

interface OEmbedData {
  title: string;
  authorName: string;
  thumbnailUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

export function TikTokEmbed({ videoId, username }: TikTokEmbedProps) {
  const [data, setData] = useState<OEmbedData | null>(null);
  const [error, setError] = useState(false);
  const videoUrl = `https://www.tiktok.com/@${username}/video/${videoId}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tiktok-oembed?videoId=${videoId}&username=${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, username]);

  // Fallback: simple styled link
  if (error || (data && !data.thumbnailUrl)) {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="my-3 flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted"
      >
        <TikTokIcon />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {data?.title || 'TikTok Video'}
          </p>
          <p className="text-xs text-muted-foreground">@{data?.authorName || username} · TikTok</p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  // Loading skeleton
  if (!data) {
    return (
      <div className="my-3 h-[180px] w-full max-w-[325px] animate-pulse rounded-lg bg-muted" />
    );
  }

  // Rich card with thumbnail
  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group my-3 block w-full max-w-[325px] overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-[9/16] max-h-[400px] w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.thumbnailUrl!}
          alt={data.title || `TikTok by @${username}`}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 text-black" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* TikTok branding */}
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1">
          <TikTokIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium text-white">TikTok</span>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-2 text-sm text-foreground">{data.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">@{data.authorName}</p>
      </div>
    </a>
  );
}

function TikTokIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.19 8.19 0 0 0 4.77 1.53V6.79a4.85 4.85 0 0 1-1.01-.1z" />
    </svg>
  );
}
