/**
 * Avatar utility functions
 *
 * Uses DiceBear API to generate deterministic avatars based on a seed (username/email).
 * This ensures each user gets a unique, consistent avatar without requiring uploads.
 */

export type AvatarStyle =
  | 'avataaars'      // Cartoon-style avatars
  | 'bottts'         // Robot avatars
  | 'identicon'      // GitHub-style geometric patterns
  | 'initials'       // Just initials
  | 'lorelei'        // Illustrated faces
  | 'micah'          // Illustrated avatars
  | 'notionists'     // Notion-style avatars
  | 'personas'       // Simple illustrated people
  | 'pixel-art'      // Pixel art style
  | 'thumbs';        // Thumbs style

// Default style for the platform
const DEFAULT_STYLE: AvatarStyle = 'bottts';

/**
 * Generate a DiceBear avatar URL based on a seed
 *
 * @param seed - The seed to generate the avatar (typically username or email)
 * @param style - The DiceBear style to use
 * @param size - The size in pixels (optional, DiceBear handles scaling)
 * @returns The DiceBear avatar URL
 */
export function generateAvatarUrl(
  seed: string,
  style: AvatarStyle = DEFAULT_STYLE,
  size?: number
): string {
  const baseUrl = `https://api.dicebear.com/7.x/${style}/svg`;
  const params = new URLSearchParams({
    seed: seed.toLowerCase().trim(),
  });

  if (size) {
    params.set('size', size.toString());
  }

  // Add some variety with background colors for bottts style
  if (style === 'bottts') {
    params.set('backgroundColor', 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf');
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get an avatar URL, with fallback to generated avatar
 *
 * @param customAvatar - User's custom avatar URL (from Google, upload, etc.)
 * @param seed - Fallback seed for generated avatar (username or email)
 * @param style - The DiceBear style to use for generated avatars
 * @returns The avatar URL to use
 */
export function getAvatarUrl(
  customAvatar: string | undefined | null,
  seed: string,
  style: AvatarStyle = DEFAULT_STYLE
): string {
  // If user has a custom avatar, use it
  if (customAvatar && customAvatar.trim()) {
    return customAvatar;
  }

  // Otherwise generate one from the seed
  return generateAvatarUrl(seed, style);
}
