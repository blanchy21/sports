/**
 * Client-side image compression using the Canvas API.
 * Compresses JPEG/PNG/WebP before upload. GIFs are skipped to preserve animation.
 */

const DEFAULTS = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  skipBelowBytes: 200 * 1024, // 200KB — already small enough
};

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compress an image file using Canvas. Returns the original file unchanged
 * if it's a GIF, already small, or compression doesn't reduce size.
 */
export async function compressImage(file: File, options?: CompressOptions): Promise<File> {
  // Skip GIFs (would lose animation)
  if (file.type === 'image/gif') return file;

  // Skip files already below threshold
  if (file.size <= DEFAULTS.skipBelowBytes) return file;

  // Only compress known raster types
  if (!file.type.startsWith('image/')) return file;

  const maxWidth = options?.maxWidth ?? DEFAULTS.maxWidth;
  const maxHeight = options?.maxHeight ?? DEFAULTS.maxHeight;
  const quality = options?.quality ?? DEFAULTS.quality;

  try {
    const bitmap = await createImageBitmap(file);

    // Calculate scaled dimensions preserving aspect ratio
    let { width, height } = bitmap;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Draw to an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Prefer WebP output; fall back to JPEG
    const outputType = supportsWebP() ? 'image/webp' : 'image/jpeg';

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, quality);
    });

    if (!blob || blob.size >= file.size) {
      // Compression didn't help — return original
      return file;
    }

    const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], baseName + ext, { type: outputType });
  } catch {
    // Canvas/bitmap failure — return the original unmodified
    return file;
  }
}

// Cached WebP support check
let _supportsWebP: boolean | null = null;

function supportsWebP(): boolean {
  if (_supportsWebP !== null) return _supportsWebP;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    _supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    _supportsWebP = false;
  }
  return _supportsWebP;
}
