import { useCallback, useRef } from 'react';
import { uploadImage } from '@/lib/hive/imageUpload';
import { logger } from '@/lib/logger';

interface UseImagePasteOptions {
  /** Username for the upload endpoint */
  username?: string;
  /** Called when upload starts */
  onUploadStart?: () => void;
  /** Called with the uploaded image URL */
  onImageUploaded: (url: string) => void;
  /** Called on error */
  onError?: (message: string) => void;
  /** Called when upload finishes (success or failure) */
  onUploadEnd?: () => void;
  /** Whether paste handling is disabled (e.g. while already uploading) */
  disabled?: boolean;
}

/**
 * Extract an image URL from pasted HTML content.
 * When users copy an image from a website, the clipboard contains HTML
 * with an <img> tag — we pull the src from it.
 */
function extractImageUrlFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match?.[1]) return null;

  const url = match[1];
  // Only accept http(s) URLs — skip data: URIs (we'll handle those as files)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return null;
}

/**
 * Hook that handles image paste events.
 *
 * Supports two clipboard scenarios:
 * 1. **Screenshot / copied file** — clipboard contains an image File
 *    → upload to Hive image hosting
 * 2. **Image copied from a website** — clipboard contains HTML with an <img> tag
 *    → extract the URL, fetch as blob, upload to Hive image hosting
 *    (re-hosting avoids hotlinking and ensures the image persists)
 */
export function useImagePaste({
  username,
  onUploadStart,
  onImageUploaded,
  onError,
  onUploadEnd,
  disabled,
}: UseImagePasteOptions) {
  const isUploadingRef = useRef(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (isUploadingRef.current) return;
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        onError?.('Pasted image is too large (max 10MB)');
        return;
      }

      isUploadingRef.current = true;
      onUploadStart?.();

      try {
        const result = await uploadImage(file, username);
        if (result.success && result.url) {
          onImageUploaded(result.url);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (err) {
        logger.error('Paste image upload error', 'useImagePaste', err);
        onError?.(err instanceof Error ? err.message : 'Failed to upload pasted image');
      } finally {
        isUploadingRef.current = false;
        onUploadEnd?.();
      }
    },
    [username, onUploadStart, onImageUploaded, onError, onUploadEnd]
  );

  const fetchAndUpload = useCallback(
    async (imageUrl: string) => {
      if (isUploadingRef.current) return;

      isUploadingRef.current = true;
      onUploadStart?.();

      try {
        // Fetch through our proxy to avoid CORS issues
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch image (${response.status})`);
        }

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('URL did not return an image');
        }

        // Convert blob to File for the upload pipeline
        const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const file = new File([blob], `pasted-image.${ext}`, { type: blob.type });
        const result = await uploadImage(file, username);

        if (result.success && result.url) {
          onImageUploaded(result.url);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (err) {
        logger.error('Paste image URL upload error', 'useImagePaste', err);
        onError?.(err instanceof Error ? err.message : 'Failed to upload image from URL');
      } finally {
        isUploadingRef.current = false;
        onUploadEnd?.();
      }
    },
    [username, onUploadStart, onImageUploaded, onError, onUploadEnd]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Priority 1: Direct image file in clipboard (screenshots, copied files)
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            return;
          }
        }
      }

      // Priority 2: HTML with an <img> tag (image copied from a website)
      for (const item of Array.from(items)) {
        if (item.type === 'text/html') {
          item.getAsString((html) => {
            const imageUrl = extractImageUrlFromHtml(html);
            if (imageUrl) {
              fetchAndUpload(imageUrl);
            }
          });
          // Don't preventDefault here — let the text paste through normally.
          // The image will be uploaded in the background. If the user copied
          // JUST an image (no text), the paste will insert nothing useful anyway.
          // We check for text content to decide whether to prevent default.
          const hasTextContent = Array.from(items).some((i) => i.type === 'text/plain');
          if (!hasTextContent) {
            e.preventDefault();
          }
          return;
        }
      }
    },
    [disabled, uploadFile, fetchAndUpload]
  );

  return { handlePaste };
}
