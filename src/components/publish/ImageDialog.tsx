'use client';

import React, { useState } from 'react';
import { X, Link as LinkIcon, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { cn } from '@/lib/utils/client';
import { validateImageUrl } from '@/lib/utils/sanitize';
import { uploadImage } from '@/lib/hive/imageUpload';
import { logger } from '@/lib/logger';

interface ImageDialogProps {
  username?: string;
  onInsert: (markdown: string) => void;
  onClose: () => void;
}

export function ImageDialog({ username, onInsert, onClose }: ImageDialogProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
  };

  const handleInsert = () => {
    if (!imageUrl) return;

    const validation = validateImageUrl(imageUrl);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image URL');
      return;
    }

    const markdown = imageAlt
      ? `\n![](${validation.url})\n<center><sub>${imageAlt}</sub></center>\n`
      : `\n![](${validation.url})\n`;

    onInsert(markdown);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadImage(file, username);

      if (result.success && result.url) {
        setImageUrl(result.url);
        setImageAlt('');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      logger.error('Image upload error', 'ImageDialog', error);
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Failed to upload image. Please try again or use a URL instead.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Insert Image</h3>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex border-b">
          <button
            onClick={() => setImageTab('url')}
            className={cn(
              'flex-1 border-b-2 py-2 text-sm font-medium transition-colors',
              imageTab === 'url'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <LinkIcon className="mr-2 inline h-4 w-4" />
            From URL
          </button>
          <button
            onClick={() => setImageTab('upload')}
            className={cn(
              'flex-1 border-b-2 py-2 text-sm font-medium transition-colors',
              imageTab === 'upload'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Upload className="mr-2 inline h-4 w-4" />
            Upload File
          </button>
        </div>

        <div className="space-y-4">
          {imageTab === 'url' ? (
            <div>
              <label className="mb-2 block text-sm font-medium">Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium">Upload Image</label>
              <div
                className={cn(
                  'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                  isUploading
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      Drag and drop or click to select
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      style={{ position: 'absolute' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleFileUpload(file);
                        };
                        input.click();
                      }}
                    >
                      Choose File
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Max 5MB · JPG, PNG, GIF, WebP
                    </p>
                  </>
                )}
              </div>
              {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Caption</label>
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Optional caption below image"
              className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {imageUrl && (
            <div className="rounded-lg border p-2">
              <p className="mb-2 text-xs text-muted-foreground">Preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={imageAlt || 'Preview'}
                className="max-h-48 w-full rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleInsert} disabled={!imageUrl || isUploading}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Insert
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
