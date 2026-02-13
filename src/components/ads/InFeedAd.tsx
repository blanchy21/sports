'use client';

import React, { useEffect, useRef } from 'react';
import { AdWrapper } from './AdWrapper';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface InFeedAdProps {
  slot?: string;
  format?: string;
  layoutKey?: string;
}

export function InFeedAd({ slot, format = 'fluid', layoutKey }: InFeedAdProps) {
  const pushed = useRef(false);
  const adSlot = slot || process.env.NEXT_PUBLIC_ADSENSE_IN_FEED_SLOT;
  const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;

  useEffect(() => {
    if (pushed.current || !publisherId || !adSlot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet — will retry on next mount
    }
  }, [publisherId, adSlot]);

  if (!publisherId || !adSlot) return null;

  return (
    <AdWrapper>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="px-3 pt-2">
          <span className="text-xs text-muted-foreground">Sponsored</span>
        </div>
        <ins
          className="adsbygoogle block"
          style={{ display: 'block' }}
          data-ad-client={publisherId}
          data-ad-slot={adSlot}
          data-ad-format={format}
          {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        />
      </div>
    </AdWrapper>
  );
}
