/**
 * HTML Sanitization Utilities
 *
 * Provides safe HTML rendering by sanitizing user-generated content
 * to prevent XSS attacks.
 */

import DOMPurify from 'dompurify';

/**
 * Default DOMPurify configuration for post content
 */
const DEFAULT_CONFIG = {
  // Allowed tags for rich content
  ALLOWED_TAGS: [
    // Text formatting
    'p', 'br', 'hr', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Links and media
    'a', 'img', 'video', 'source', 'iframe',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Code
    'pre', 'code', 'blockquote',
    // Other
    'sup', 'sub', 'mark',
  ],
  // Allowed attributes
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'width', 'height', 'target', 'rel',
    'style', 'align', 'colspan', 'rowspan',
    'frameborder', 'allowfullscreen', 'loading',
  ],
  // Allow data: URLs for images (base64 embedded)
  ALLOW_DATA_ATTR: false,
  // Allow safe URI schemes
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Force all links to open in new tab with security attributes
  ADD_ATTR: ['target', 'rel'],
};

/**
 * Strict configuration for comments/short content
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'code'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize HTML content for safe rendering
 *
 * @param dirty - Untrusted HTML string
 * @param strict - Use strict mode (for comments, limited formatting)
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirty: string, strict = false): string {
  if (typeof window === 'undefined') {
    // Server-side: return empty or basic text
    // DOMPurify requires DOM, so we strip all HTML on server
    return dirty.replace(/<[^>]*>/g, '');
  }

  const config = strict ? STRICT_CONFIG : DEFAULT_CONFIG;

  // Sanitize the HTML
  let clean = DOMPurify.sanitize(dirty, config);

  // Post-process: ensure all links have security attributes
  clean = clean.replace(
    /<a\s+([^>]*?)>/gi,
    (match, attrs) => {
      // Add target="_blank" if not present
      if (!attrs.includes('target=')) {
        attrs += ' target="_blank"';
      }
      // Add rel="noopener noreferrer" if not present
      if (!attrs.includes('rel=')) {
        attrs += ' rel="noopener noreferrer"';
      } else if (!attrs.includes('noopener')) {
        attrs = attrs.replace(/rel="([^"]*)"/, 'rel="$1 noopener noreferrer"');
      }
      return `<a ${attrs}>`;
    }
  );

  return clean;
}

/**
 * Sanitize and transform markdown-style content to HTML
 *
 * This handles common Hive post patterns like:
 * - <center> tags (non-standard HTML)
 * - Markdown image syntax ![alt](url)
 *
 * @param content - Raw post content (may contain markdown/HTML mix)
 * @returns Sanitized HTML ready for rendering
 */
export function sanitizePostContent(content: string): string {
  if (!content) return '';

  // Transform common patterns before sanitization
  const processed = content
    // Convert <center> to div (non-standard but common in Hive)
    .replace(/<center>/gi, '<div class="text-center my-4">')
    .replace(/<\/center>/gi, '</div>')
    // Convert markdown images to HTML
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-md my-4" loading="lazy" />'
    );

  // Sanitize the processed content
  return sanitizeHtml(processed);
}

/**
 * Sanitize comment content (stricter rules)
 *
 * @param content - Raw comment content
 * @returns Sanitized HTML for comment display
 */
export function sanitizeComment(content: string): string {
  if (!content) return '';
  return sanitizeHtml(content, true);
}

/**
 * Strip all HTML tags and return plain text
 *
 * @param html - HTML string
 * @returns Plain text with all tags removed
 */
export function stripHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Check if content contains potentially dangerous elements
 *
 * @param content - Content to check
 * @returns true if suspicious patterns detected
 */
export function hasSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /data:/i,
    /<iframe[^>]*src\s*=\s*["'](?!https:\/\/(www\.)?(youtube|vimeo|3speak))/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(content));
}

// ============================================
// URL Validation Utilities
// ============================================

/**
 * Allowed protocols for URLs
 */
const ALLOWED_URL_PROTOCOLS = ['https:', 'http:'];

/**
 * Allowed protocols for image URLs (more restrictive)
 */
const ALLOWED_IMAGE_PROTOCOLS = ['https:', 'http:'];

/**
 * Validate a URL is safe and well-formed
 *
 * @param url - URL string to validate
 * @param options - Validation options
 * @returns Validation result with sanitized URL or error
 */
export function validateUrl(
  url: string,
  options: {
    allowedProtocols?: string[];
    requireHttps?: boolean;
  } = {}
): { valid: boolean; url?: string; error?: string } {
  const { allowedProtocols = ALLOWED_URL_PROTOCOLS, requireHttps = false } = options;

  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Trim whitespace
  const trimmed = url.trim();

  if (!trimmed) {
    return { valid: false, error: 'URL is required' };
  }

  // Block javascript: and data: URLs immediately
  const lowerUrl = trimmed.toLowerCase();
  if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
    return { valid: false, error: 'Invalid URL protocol' };
  }

  try {
    // Parse the URL
    const parsed = new URL(trimmed);

    // Check protocol
    if (!allowedProtocols.includes(parsed.protocol)) {
      return {
        valid: false,
        error: `URL must use ${allowedProtocols.join(' or ')} protocol`,
      };
    }

    // Require HTTPS if specified
    if (requireHttps && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTPS' };
    }

    // Return the parsed href (normalized)
    return { valid: true, url: parsed.href };
  } catch {
    // Try adding https:// if no protocol
    if (!trimmed.includes('://')) {
      try {
        const withProtocol = new URL(`https://${trimmed}`);
        if (allowedProtocols.includes(withProtocol.protocol)) {
          return { valid: true, url: withProtocol.href };
        }
      } catch {
        // Fall through to error
      }
    }

    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate an image URL
 * More restrictive than general URL validation
 *
 * @param url - Image URL to validate
 * @returns Validation result
 */
export function validateImageUrl(url: string): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  const result = validateUrl(url, {
    allowedProtocols: ALLOWED_IMAGE_PROTOCOLS,
  });

  if (!result.valid) {
    return result;
  }

  // Additional image-specific checks
  const parsed = new URL(result.url!);

  // Block localhost and private IPs in production
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  ) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, error: 'Private URLs not allowed' };
    }
  }

  return result;
}

/**
 * Check if a URL points to a known trusted image host
 *
 * @param url - URL to check
 * @returns true if URL is from a trusted host
 */
export function isTrustedImageHost(url: string): boolean {
  const trustedHosts = [
    'images.hive.blog',
    'images.ecency.com',
    'files.peakd.com',
    'cdn.steemitimages.com',
    'steemitimages.com',
    'images.unsplash.com',
    'gateway.ipfs.io',
    'ipfs.io',
    'files.3speak.tv',
    'files.dtube.tv',
    'i.imgur.com',
    'imgur.com',
    'media.tenor.com',
  ];

  try {
    const parsed = new URL(url);
    return trustedHosts.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}
