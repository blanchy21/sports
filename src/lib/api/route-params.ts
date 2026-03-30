/**
 * Extract a named path segment from a URL by matching the segment before it.
 * Example: extractPathParam('/api/ipl-bb/competition/abc123/pick', 'competition') returns 'abc123'
 */
export function extractPathParam(url: string, segmentName: string): string | null {
  const pathname = new URL(url).pathname;
  const parts = pathname.split('/');
  const idx = parts.indexOf(segmentName);
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1] || null;
}
