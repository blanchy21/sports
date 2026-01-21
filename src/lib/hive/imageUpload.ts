/**
 * Hive Image Upload Utility
 *
 * Uploads images to Hive's image hosting services (images.hive.blog or images.ecency.com)
 * These services require a signature from a Hive account's posting key.
 */

// Image hosting endpoints
const IMAGE_ENDPOINTS = {
  hive: 'https://images.hive.blog',
  ecency: 'https://images.ecency.com',
};

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image using Hive Keychain
 * This is the preferred method as it doesn't expose the private key
 */
export async function uploadImageWithKeychain(
  file: File,
  username: string
): Promise<ImageUploadResult> {
  // Check if Keychain is available
  const keychain = (window as Window & { hive_keychain?: {
    requestSignBuffer: (
      username: string,
      message: string,
      keyType: string,
      callback: (response: { success: boolean; result?: string; error?: string }) => void
    ) => void;
  } }).hive_keychain;

  if (!keychain) {
    return {
      success: false,
      error: 'Hive Keychain is not installed. Please install the Hive Keychain browser extension.',
    };
  }

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Create the challenge string: "ImageSigningChallenge" + file data as hex
    const prefix = 'ImageSigningChallenge';
    const prefixBuffer = new TextEncoder().encode(prefix);
    const combined = new Uint8Array(prefixBuffer.length + arrayBuffer.byteLength);
    combined.set(prefixBuffer, 0);
    combined.set(new Uint8Array(arrayBuffer), prefixBuffer.length);

    // Convert to hex for Keychain signing
    const hexString = Array.from(combined)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Request signature from Keychain
    const signature = await new Promise<string>((resolve, reject) => {
      keychain.requestSignBuffer(
        username,
        hexString,
        'Posting',
        (response: { success: boolean; result?: string; error?: string }) => {
          if (response.success && response.result) {
            resolve(response.result);
          } else {
            reject(new Error(response.error || 'Signing failed'));
          }
        }
      );
    });

    // Upload to image server
    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `${IMAGE_ENDPOINTS.hive}/${username}/${signature}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.url) {
      return { success: true, url: data.url };
    } else {
      throw new Error('No URL returned from server');
    }
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}


/**
 * Check if Hive Keychain is available
 */
export function isKeychainAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!(window as Window & { hive_keychain?: unknown }).hive_keychain;
}
