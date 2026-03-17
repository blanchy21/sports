'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { PredictionPromoCard } from './PredictionPromoCard';
import { captureElementAsImage, type CaptureResult } from '@/lib/utils/card-capture';
import { uploadImage } from '@/lib/hive/imageUpload';
import {
  createSportsbiteOperation,
  createCommentOptionsOperation,
} from '@/lib/hive-workerbee/shared';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useTransactionConfirmation } from '@/hooks/useTransactionConfirmation';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { SPORTSBITES_CONFIG } from '@/lib/hive-workerbee/shared';
import { logger } from '@/lib/logger';
import type { PredictionBite } from '@/lib/predictions/types';

interface ShareToSportsbiteModalProps {
  prediction: PredictionBite;
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ShareState = 'capturing' | 'ready' | 'uploading' | 'posting' | 'done' | 'error';

export function ShareToSportsbiteModal({
  prediction,
  username,
  isOpen,
  onClose,
  onSuccess,
}: ShareToSportsbiteModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ShareState>('capturing');
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [text, setText] = useState(() => {
    const status = prediction.status === 'OPEN' ? 'New prediction' : 'Prediction';
    return `\uD83C\uDFAF ${status}: "${prediction.title}" by @${prediction.creatorUsername} \u2014 ${prediction.totalPool} MEDALS pool! Stake your pick on sportsblock.app/predictions`;
  });

  const { broadcast } = useBroadcast();
  const { confirm: confirmTx } = useTransactionConfirmation();

  const charCount = text.length;
  const maxChars = SPORTSBITES_CONFIG.MAX_CHARS;
  const remainingChars = maxChars - charCount;

  const capture = useCallback(async () => {
    if (!cardRef.current) return;
    setState('capturing');
    try {
      const res = await captureElementAsImage(cardRef.current);
      setCaptureResult(res);
      setState('ready');
    } catch {
      setState('error');
      setErrorMessage('Failed to generate preview image');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(capture, 200);
    return () => clearTimeout(timer);
  }, [isOpen, capture]);

  const handlePost = useCallback(async () => {
    if (!captureResult || !username) return;
    if (text.trim().length === 0 || remainingChars < 0) return;

    try {
      // Step 1: Upload card image
      setState('uploading');
      const imageFile = new File([captureResult.blob], 'prediction-card.png', {
        type: 'image/png',
      });
      const uploadResult = await uploadImage(imageFile, username);
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload prediction image');
      }

      // Step 2: Ensure daily container exists
      setState('posting');
      const ensureRes = await fetch('/api/hive/sportsbites/ensure-container', { method: 'POST' });
      const ensureData = await ensureRes.json();
      if (!ensureData.success) {
        throw new Error(ensureData.error || 'Failed to prepare sportsbites container');
      }

      // Step 3: Build and broadcast sportsbite with image
      const operation = createSportsbiteOperation({
        body: text,
        author: username,
        images: [uploadResult.url],
      });

      const commentOptionsOp = createCommentOptionsOperation({
        author: username,
        permlink: operation.permlink,
      });

      const result = await broadcast(
        [
          ['comment', operation],
          ['comment_options', commentOptionsOp],
        ],
        'posting'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to broadcast sportsbite');
      }

      if (result.transactionId) {
        confirmTx(result.transactionId);
      }

      setState('done');
      onSuccess?.();
      setTimeout(onClose, 1500);
    } catch (err) {
      logger.error('Share to sportsbite failed', 'ShareToSportsbiteModal', err);
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to share prediction');
    }
  }, [captureResult, username, text, remainingChars, broadcast, confirmTx, onSuccess, onClose]);

  const canPost = state === 'ready' && text.trim().length > 0 && remainingChars >= 0;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Share to Sportsbites" size="lg">
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
        <PredictionPromoCard ref={cardRef} prediction={prediction} />
      </div>

      <div className="space-y-4">
        {/* Preview */}
        {state === 'capturing' && (
          <div className="flex h-48 items-center justify-center rounded-lg bg-sb-turf">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {(state === 'ready' || state === 'uploading' || state === 'posting') && captureResult && (
          <div className="overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={captureResult.dataUrl}
              alt="Prediction card preview"
              className="w-full"
              style={{ aspectRatio: '1200/630' }}
            />
          </div>
        )}

        {state === 'done' && (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg bg-sb-win-bg text-sb-win">
            <span className="text-2xl">{'\u2705'}</span>
            <p className="font-semibold">Shared to Sportsbites!</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg bg-destructive/10 text-destructive">
            <p className="text-sm">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={capture}>
              Retry
            </Button>
          </div>
        )}

        {/* Text input */}
        {state !== 'done' && (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={cn(
                'w-full resize-none rounded-lg border bg-sb-turf/50 p-3 text-sm outline-none',
                'focus:ring-2 focus:ring-primary',
                'min-h-[80px]'
              )}
              disabled={state === 'uploading' || state === 'posting'}
              maxLength={maxChars + 50}
            />
            <div className="mt-1 flex justify-end">
              <span
                className={cn(
                  'text-xs',
                  remainingChars < 0
                    ? 'text-destructive'
                    : remainingChars <= 20
                      ? 'text-warning'
                      : 'text-muted-foreground'
                )}
              >
                {remainingChars}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        {state !== 'done' && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePost}
              disabled={!canPost}
              className="flex-1 bg-sb-gold text-[#1A0A00] hover:bg-sb-gold/90"
            >
              {state === 'uploading' ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : state === 'posting' ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" />
                  Post to Sportsbites
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
