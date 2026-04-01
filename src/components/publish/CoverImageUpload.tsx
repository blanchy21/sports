'use client';

import React, { useCallback, useState } from 'react';
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { uploadImage } from '@/lib/hive/imageUpload';
import { compressImage } from '@/lib/utils/image-compression';
import { logger } from '@/lib/logger';

interface CoverImageUploadProps {
  coverImage: string;
  onCoverImageChange: (url: string) => void;
  username?: string;
}

export function CoverImageUpload({
  coverImage,
  onCoverImageChange,
  username,
}: CoverImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const compressed = await compressImage(file);
        const result = await uploadImage(compressed, username);
        if (result.success && result.url) {
          onCoverImageChange(result.url);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (err) {
        logger.error('Cover image upload error', 'CoverImageUpload', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [onCoverImageChange, username]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [handleUpload]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleUpload(file);
            return;
          }
        }
      }
    },
    [handleUpload]
  );

  // Show the cover image if set
  if (coverImage) {
    return (
      <div className="group relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt="Cover"
          className="h-40 w-full object-cover sm:h-48"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
            setError('Failed to load image');
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-white/90 p-2 text-gray-700 shadow transition-colors hover:bg-white"
              title="Change cover image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onCoverImageChange('')}
              className="rounded-full bg-white/90 p-2 text-gray-700 shadow transition-colors hover:bg-white"
              title="Remove cover image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Empty state — drop zone
  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer items-center justify-center gap-2 border-b px-4 py-3 transition-colors',
          isDragging ? 'border-primary bg-primary/10' : 'bg-sb-turf/30 hover:bg-sb-turf/50',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add cover image</span>
          </>
        )}
      </div>
      {error && <p className="bg-destructive/5 px-4 py-1 text-xs text-destructive">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
