'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Download, ExternalLink } from 'lucide-react';

const DISMISS_KEY = 'sb_keys_banner_dismissed';

export const KeyDownloadBanner: React.FC = () => {
  const { user, authType } = useAuth();
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash
  const [downloading, setDownloading] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // Check dismiss state after mount
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(wasDismissed);
  }, []);

  const shouldShow =
    authType === 'soft' &&
    user?.hiveUsername &&
    user.keysDownloaded !== true &&
    !downloaded &&
    !dismissed;

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch('/api/hive/download-keys');
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Failed to download keys');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
        'sportsblock-keys.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDownloaded(true);
    } catch (err) {
      console.error('Key download failed:', err);
      setDownloadError(
        err instanceof Error ? err.message : 'Failed to download keys. Please try again.'
      );
    } finally {
      setDownloading(false);
    }
  }, []);

  if (!shouldShow) return null;

  return (
    <div className="relative mx-auto mb-4 max-w-4xl rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded p-1 text-amber-400/60 transition-colors hover:text-amber-400"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-200">
            Your Hive keys are stored on our server. Download them to take full control of your
            account.
          </p>
          {showLearnMore && (
            <div className="mt-2 text-xs text-amber-200/70">
              <p>
                Hive keys let you sign into any Hive app and manage your account independently.
                Import them into{' '}
                <a
                  href="https://hive-keychain.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline hover:text-amber-200"
                >
                  Hive Keychain
                  <ExternalLink className="h-3 w-3" />
                </a>{' '}
                for self-custody.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLearnMore((v) => !v)}
              className="whitespace-nowrap text-xs text-amber-300/70 underline hover:text-amber-300"
            >
              {showLearnMore ? 'Hide' : 'Learn more'}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Downloading...' : 'Download Keys'}
            </button>
          </div>
          {downloadError && <p className="text-xs text-red-400">{downloadError}</p>}
        </div>
      </div>
    </div>
  );
};
