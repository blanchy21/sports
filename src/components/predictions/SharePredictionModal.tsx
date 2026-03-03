'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { PredictionResultCard } from './PredictionResultCard';
import { captureElementAsImage, downloadBlob, type CaptureResult } from '@/lib/utils/card-capture';
import { usePredictionStats } from '@/lib/react-query/queries/usePredictionStats';
import { Download, Twitter, Link as LinkIcon, Loader2 } from 'lucide-react';
import type { PredictionBite } from '@/lib/predictions/types';

interface SharePredictionModalProps {
  prediction: PredictionBite;
  username: string;
  userPayout: number;
  totalUserStake: number;
  winningOutcomeLabel: string;
  isOpen: boolean;
  onClose: () => void;
}

type CaptureState = 'capturing' | 'ready' | 'error';

export function SharePredictionModal({
  prediction,
  username,
  userPayout,
  totalUserStake,
  winningOutcomeLabel,
  isOpen,
  onClose,
}: SharePredictionModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CaptureState>('capturing');
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: stats } = usePredictionStats(username);

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
    const timer = setTimeout(capture, 200);
    return () => clearTimeout(timer);
  }, [isOpen, capture]);

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, `sportsblock-prediction-${prediction.id}.png`);
  };

  const handleShareX = () => {
    const profit = userPayout - totalUserStake;
    const text = [
      `Called it! ${prediction.title}`,
      `${profit >= 0 ? '+' : ''}${profit.toFixed(0)} MEDALS profit`,
      stats
        ? `${(stats.winRate * 100).toFixed(0)}% accurate on @sportsblockapp`
        : 'on @sportsblockapp',
      'sportsblock.app/predictions',
    ].join(' \u2705 ');

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://sportsblock.app/predictions');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — non-HTTPS or denied
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Share Your Win" size="lg">
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
        <PredictionResultCard
          ref={cardRef}
          title={prediction.title}
          matchReference={prediction.matchReference}
          sportCategory={prediction.sportCategory}
          winningOutcomeLabel={winningOutcomeLabel}
          username={username}
          staked={totalUserStake}
          payout={userPayout}
          winRate={stats?.winRate ?? 0}
          currentStreak={stats?.currentStreak ?? 0}
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
              alt="Prediction result card"
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
