/**
 * Text processing utilities for Hive content.
 * Leaf module — no internal imports.
 */

/**
 * Generate a unique permlink for posts/comments.
 * When parentAuthor is provided, uses the Hive reply convention: `re-{author}-{timestamp}-{random}`
 */
export function generatePermlink(title: string, parentAuthor?: string): string {
  if (parentAuthor) {
    // Sanitize parentAuthor: Hive usernames can contain dots, but permlinks only allow a-z, 0-9, -
    const sanitizedAuthor = parentAuthor.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `re-${sanitizedAuthor}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const basePermlink = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${basePermlink}-${timestamp}-${randomSuffix}`;
}

/**
 * Strip markdown syntax to produce plain text for descriptions.
 * Removes images, links, headers, bold/italic, code blocks, blockquotes, and HR rules.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // fenced code blocks
    .replace(/`[^`]+`/g, '') // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links → keep text
    .replace(/^#{1,6}\s+/gm, '') // headers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^[-*]{3,}$/gm, '') // horizontal rules
    .replace(/\n{2,}/g, ' ') // collapse multiple newlines
    .replace(/\n/g, ' ') // remaining newlines
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

/**
 * Extract @-mentioned Hive usernames from post/comment body.
 * Returns lowercase, deduplicated usernames without the leading '@'.
 * Filters out the post author to avoid self-mentions.
 */
export function extractMentions(body: string, author?: string): string[] {
  // Hive account names: 3-16 chars, starts with letter, lowercase alphanumeric + dots/hyphens
  const matches = body.match(/(?:^|[^a-zA-Z0-9])@([a-z][a-z0-9.-]{2,15})/g);
  if (!matches) return [];

  const seen = new Set<string>();
  const users: string[] = [];

  for (const match of matches) {
    const atIndex = match.indexOf('@');
    const username = match.slice(atIndex + 1).toLowerCase();
    if (author && username === author.toLowerCase()) continue;
    if (seen.has(username)) continue;
    seen.add(username);
    users.push(username);
  }

  return users;
}

/**
 * Extract #hashtags from sportsbite body text.
 * Returns lowercase tag names without the leading '#'.
 * Filters out system tags, sport category IDs, and single-char tags.
 */
export function extractHashtags(body: string): string[] {
  const SYSTEM_TAGS = new Set([
    'sportsblock',
    'sportsbites',
    'microblog',
    'sportsarena',
    'hive-115814',
  ]);
  const matches = body.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const match of matches) {
    const tag = match.slice(1).toLowerCase();
    if (tag.length <= 1) continue;
    if (SYSTEM_TAGS.has(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function extractMediaFromBody(body: string): {
  images: string[];
  text: string;
} {
  const images: string[] = [];
  // Use [\s\S] to handle URLs that wrap across lines in Hive markdown
  const imageRegex = /!\[[\s\S]*?\]\(([\s\S]*?)\)/g;
  let m;
  while ((m = imageRegex.exec(body)) !== null) {
    // Clean up any whitespace/newlines within the captured URL
    images.push(m[1].replace(/\s+/g, ''));
  }
  const text = body
    .replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, '') // Markdown images (multiline)
    .replace(/<img[^>]*\/?>/gi, '') // HTML <img> tags
    .trim();
  return { images, text };
}
