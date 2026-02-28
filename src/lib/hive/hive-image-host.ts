import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { logger } from '@/lib/logger';

const IMAGE_HOSTS = ['https://images.hive.blog', 'https://images.ecency.com'];

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a buffer to Hive image hosting (images.hive.blog / images.ecency.com).
 *
 * Signs the image data using the configured service account's posting key,
 * then tries each image host until one succeeds.
 *
 * Requires HIVE_IMAGE_UPLOAD_ACCOUNT and HIVE_IMAGE_UPLOAD_KEY env vars.
 */
export async function uploadBufferToHiveImageHost(
  imageData: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  const account = process.env.HIVE_IMAGE_UPLOAD_ACCOUNT;
  const key = process.env.HIVE_IMAGE_UPLOAD_KEY;

  if (!account || !key) {
    return { success: false, error: 'Image upload is not configured' };
  }

  // Create the signing challenge: SHA-256("ImageSigningChallenge" + imageData)
  const prefix = Buffer.from('ImageSigningChallenge');
  const challengeBuffer = Buffer.concat([prefix, imageData]);
  const hash = cryptoUtils.sha256(challengeBuffer);

  // Sign the hash with the service account's posting key
  const privateKey = PrivateKey.fromString(key);
  const signature = privateKey.sign(hash).toString();

  // Try each image host until one succeeds
  let lastStatus = 0;
  let lastError = '';

  for (const host of IMAGE_HOSTS) {
    try {
      const uploadFormData = new FormData();
      const blob = new Blob([new Uint8Array(imageData)], { type: mimeType });
      uploadFormData.append('file', blob, fileName);

      const uploadUrl = `${host}/${account}/${signature}`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadFormData,
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastError = await response.text().catch(() => '');
        logger.error(
          `Image upload to ${host} failed: ${response.status} ${lastError}`,
          'hive-image-host'
        );
        continue;
      }

      const result = await response.json();
      if (result.url) {
        return { success: true, url: result.url };
      }

      lastError = 'No URL in response';
      continue;
    } catch (err) {
      logger.error(`Image upload to ${host} error`, 'hive-image-host', err);
      lastError = err instanceof Error ? err.message : 'Unknown error';
      continue;
    }
  }

  return {
    success: false,
    error: `All image hosts failed (last: ${lastStatus || lastError})`,
  };
}
