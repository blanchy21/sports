/**
 * Linkify #hashtags in sportsbite HTML content.
 *
 * Converts `#PremierLeague` into a clickable link to `/sportsbites?tag=premierleague`.
 * Skips system/infrastructure tags and avoids transforming text inside HTML tags.
 */

const SYSTEM_TAGS = new Set([
  'sportsblock',
  'sportsbites',
  'microblog',
  'sportsarena',
  'hive-115814',
]);

/**
 * Transform hashtags in sanitized HTML into clickable `<a>` links.
 *
 * Uses an alternation regex: the first branch captures full HTML tags
 * (so hashtags inside attributes like `href="#anchor"` are never touched),
 * and the second branch captures `#tag` patterns in text content.
 */
export function linkifyHashtags(html: string): string {
  return html.replace(
    /(<[^>]*>)|#([a-zA-Z][a-zA-Z0-9_]*)/g,
    (match, htmlTag: string | undefined, tag: string | undefined) => {
      // HTML tag — return unchanged
      if (htmlTag) return htmlTag;
      if (!tag) return match;

      const lower = tag.toLowerCase();
      if (SYSTEM_TAGS.has(lower)) return match;

      return `<a href="/sportsbites?tag=${encodeURIComponent(lower)}" class="text-primary hover:underline">#${tag}</a>`;
    }
  );
}
