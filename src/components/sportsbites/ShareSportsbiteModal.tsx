'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { SportsbiteResultCard } from './SportsbiteResultCard';
import { captureElementAsImage, downloadBlob, type CaptureResult } from '@/lib/utils/card-capture';
import { Download, Twitter, Link as LinkIcon, Loader2 } from 'lucide-react';
import type { Sportsbite } from '@/lib/hive-workerbee/shared';

interface ShareSportsbiteModalProps {
  sportsbite: Sportsbite;
  biteText: string;
  isOpen: boolean;
  onClose: () => void;
}

type CaptureState = 'capturing' | 'ready' | 'error';

export function ShareSportsbiteModal({
  sportsbite,
  biteText,
  isOpen,
  onClose,
}: ShareSportsbiteModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CaptureState>('capturing');
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [copied, setCopied] = useState(false);

  const capture = useCallback(async () => {
    if (!cardRef.current) return;
    setState('capturing');
    try {
      const res = await captureElementAsImage(cardRef.current);
      setResult(res);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  // Capture on mount (small delay so the hidden card renders)
  useEffect(() => {
    if (!isOpen) return;
    setState('capturing');
    setResult(null);
    const timer = setTimeout(capture, 200);
    return () => clearTimeout(timer);
  }, [isOpen, capture]);

  const biteUrl = `https://sportsblock.app/@${sportsbite.author}/${sportsbite.permlink}`;

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, `sportsblock-bite-${sportsbite.permlink}.png`);
  };

  const getShareText = () => {
    const preview = biteText.substring(0, 100);
    return `${preview}${biteText.length > 100 ? '...' : ''} on @sportsblockapp\n${biteUrl}`;
  };

  const handleShareX = async () => {
    if (!result) return;

    const text = getShareText();
    const file = new File([result.blob], 'sportsblock-bite.png', { type: 'image/png' });

    // Try Web Share API with image (works on mobile + some desktop browsers)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ text, files: [file] });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to fallback
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // Fallback: download the image, then open tweet intent
    downloadBlob(result.blob, `sportsblock-bite-${sportsbite.permlink}.png`);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(biteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — non-HTTPS or denied
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Share Sportsbite" size="lg">
      {/* Hidden capture target */}
      <div
        style={{
          position: 'fixed',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
          top: 0,
          left: 0,
        }}
        aria-hidden="true"
      >
        <SportsbiteResultCard
          ref={cardRef}
          author={sportsbite.author}
          body={biteText}
          sportCategory={sportsbite.sportCategory}
          votes={sportsbite.active_votes?.length || sportsbite.net_votes || 0}
          replies={sportsbite.children || 0}
          created={sportsbite.created}
          authorDisplayName={sportsbite.authorDisplayName}
        />
      </div>

      {/* Preview */}
      <div className="space-y-4">
        {state === 'capturing' && (
          <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state === 'ready' && result && (
          <div className="overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.dataUrl}
              alt="Sportsbite share card"
              className="w-full"
              style={{ aspectRatio: '1200/630' }}
            />
          </div>
        )}

        {state === 'error' && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg bg-destructive/10 text-destructive">
            <p className="text-sm">Failed to generate image</p>
            <Button size="sm" variant="outline" onClick={capture}>
              Retry
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={state !== 'ready'}
            className="flex-1"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download PNG
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleShareX}
            disabled={state !== 'ready'}
            className="flex-1"
          >
            <Twitter className="mr-1.5 h-4 w-4" />
            Share on X
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCopyLink} className="flex-1">
            <LinkIcon className="mr-1.5 h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
