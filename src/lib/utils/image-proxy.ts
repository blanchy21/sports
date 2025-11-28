/**
 * Image Proxy Utility
 * 
 * Replaces external image URLs with proxy URLs to avoid CORS issues
 */

const PROXY_DOMAINS = [
  'files.peakd.com',
  'files.ecency.com',
  'files.3speak.tv',
  'files.dtube.tv',
  'cdn.steemitimages.com',
  'steemitimages.com',
  'images.hive.blog',
  'gateway.ipfs.io',
  'ipfs.io',
];

/**
 * Check if a URL should be proxied
 */
export function shouldProxyImage(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return PROXY_DOMAINS.some(
      domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Convert an external image URL to a proxy URL
 */
export function getProxyImageUrl(imageUrl: string): string {
  if (!shouldProxyImage(imageUrl)) {
    return imageUrl;
  }

  const encodedUrl = encodeURIComponent(imageUrl);
  return `/api/image-proxy?url=${encodedUrl}`;
}

/**
 * Replace all image URLs in markdown/html content with proxy URLs
 */
export function proxyImagesInContent(content: string): string {
  // Match markdown image syntax: ![alt](url)
  content = content.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, url) => {
      if (shouldProxyImage(url)) {
        return `![${alt}](${getProxyImageUrl(url)})`;
      }
      return match;
    }
  );

  // Match HTML img tags: <img src="url" ...>
  content = content.replace(
    /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      if (shouldProxyImage(url)) {
        return `<img ${before}src="${getProxyImageUrl(url)}"${after}>`;
      }
      return match;
    }
  );

  return content;
}

