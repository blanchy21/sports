import React from 'react';
import { InFeedAd } from '@/components/ads/InFeedAd';

export const AD_FREQUENCY = 5;

interface InterleaveAdsOptions {
  frequency?: number;
  slot?: string;
  maxAds?: number;
}

export function interleaveAds(
  items: React.ReactNode[],
  options: InterleaveAdsOptions = {}
): React.ReactNode[] {
  const { frequency = AD_FREQUENCY, slot, maxAds = Infinity } = options;

  if (items.length === 0 || frequency <= 0) return items;

  const result: React.ReactNode[] = [];
  let adCount = 0;

  for (let i = 0; i < items.length; i++) {
    result.push(items[i]);

    if ((i + 1) % frequency === 0 && i < items.length - 1 && adCount < maxAds) {
      result.push(<InFeedAd key={`in-feed-ad-${adCount}`} slot={slot} />);
      adCount++;
    }
  }

  return result;
}
