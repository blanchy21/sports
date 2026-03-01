/**
 * Image Upload Utility
 *
 * Uploads images via server-side proxy to images.hive.blog.
 * The server handles signing with a dedicated service account,
 * so no wallet interaction is needed for image uploads.
 */

import { compressImage } from '@/lib/utils/image-compression';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image via the server-side Hive image proxy.
 * Compresses the image client-side before uploading (skips GIFs and small files).
 * Returns a Hive-native URL (images.hive.blog) for use in post markdown.
 */
export async function uploadImage(file: File, _username?: string): Promise<ImageUploadResult> {
  try {
    // Compress before upload (no-op for GIFs and files <200KB)
    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append('file', compressed);

    const response = await fetch('/api/hive/image-upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Upload failed (${response.status})`,
      };
    }

    const data = await response.json();
    return { success: true, url: data.url };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
