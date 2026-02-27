'use client';

import React, { useState } from 'react';
import { X, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { validateUrl } from '@/lib/utils/sanitize';

interface LinkDialogProps {
  onInsert: (url: string, text: string) => void;
  onClose: () => void;
}

export function LinkDialog({ onInsert, onClose }: LinkDialogProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleInsert = () => {
    if (!linkUrl) return;

    const validation = validateUrl(linkUrl);
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    onInsert(validation.url!, linkText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Insert Link</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">URL</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com"
              className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Link Text (optional)</label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Click here"
              className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleInsert} disabled={!linkUrl}>
              <LinkIcon className="mr-2 h-4 w-4" />
              Insert
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
