/** @jest-environment jsdom */

import {
  sanitizeHtml,
  sanitizePostContent,
  sanitizeComment,
  stripHtml,
  hasSuspiciousContent,
  validateUrl,
  validateImageUrl,
  isTrustedImageHost,
} from '@/lib/utils/sanitize';

// ---------------------------------------------------------------------------
// sanitizeHtml
// ---------------------------------------------------------------------------

describe('sanitizeHtml', () => {
  it('strips <script> tags', () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain('<script');
    expect(result).toContain('Hello');
  });

  it('allows safe tags like p, strong, a, img', () => {
    const html = '<p><strong>Bold</strong> and <a href="https://example.com">link</a></p>';
    const result = sanitizeHtml(html);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<a ');
  });

  it('adds target="_blank" and rel="noopener noreferrer" to links', () => {
    const result = sanitizeHtml('<a href="https://example.com">click</a>');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('strict mode only allows limited tags', () => {
    const html = '<div><h1>Title</h1><p>text</p><img src="x.png" /></div>';
    const result = sanitizeHtml(html, true);
    // strict allows p but not div, h1, img
    expect(result).not.toContain('<div');
    expect(result).not.toContain('<h1');
    expect(result).not.toContain('<img');
    expect(result).toContain('<p>');
  });
});

// ---------------------------------------------------------------------------
// sanitizePostContent
// ---------------------------------------------------------------------------

describe('sanitizePostContent', () => {
  it('converts markdown images to <img> tags', () => {
    const result = sanitizePostContent('![alt text](https://example.com/img.png)');
    expect(result).toContain('<img');
    expect(result).toContain('src="https://example.com/img.png"');
    expect(result).toContain('alt="alt text"');
  });

  it('converts markdown links to <a> tags', () => {
    const result = sanitizePostContent('[click here](https://example.com)');
    expect(result).toContain('<a');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('click here');
  });

  it('converts # Header to <h1>', () => {
    const result = sanitizePostContent('# My Title');
    expect(result).toContain('<h1');
    expect(result).toContain('My Title');
  });

  it('converts --- to <hr>', () => {
    const result = sanitizePostContent('---');
    expect(result).toContain('<hr');
  });

  it('converts markdown tables to HTML tables', () => {
    const table = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const result = sanitizePostContent(table);
    expect(result).toContain('<table>');
    expect(result).toContain('<th');
    expect(result).toContain('<td');
  });

  it('converts <center> to <div>', () => {
    const result = sanitizePostContent('<center>centered</center>');
    expect(result).toContain('<div');
    expect(result).not.toContain('<center');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizePostContent('')).toBe('');
  });

  // Bold
  it('converts **bold** to <strong>', () => {
    const result = sanitizePostContent('This is **bold** text');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('converts __bold__ to <strong>', () => {
    const result = sanitizePostContent('This is __bold__ text');
    expect(result).toContain('<strong>bold</strong>');
  });

  // Italic
  it('converts *italic* to <em>', () => {
    const result = sanitizePostContent('This is *italic* text');
    expect(result).toContain('<em>italic</em>');
  });

  it('converts _italic_ to <em>', () => {
    const result = sanitizePostContent('This is _italic_ text');
    expect(result).toContain('<em>italic</em>');
  });

  it('does not italicize underscores in words like some_var_name', () => {
    const result = sanitizePostContent('some_var_name');
    expect(result).not.toContain('<em>');
  });

  // Strikethrough
  it('converts ~~strikethrough~~ to <del>', () => {
    const result = sanitizePostContent('This is ~~deleted~~ text');
    expect(result).toContain('<del>deleted</del>');
  });

  // Inline code
  it('converts `code` to <code>', () => {
    const result = sanitizePostContent('Use `console.log` here');
    expect(result).toContain('<code>');
    expect(result).toContain('console.log');
  });

  it('does not process markdown inside inline code', () => {
    const result = sanitizePostContent('Use `**not bold**` here');
    expect(result).not.toContain('<strong>');
  });

  // Fenced code blocks
  it('converts fenced code blocks to <pre><code>', () => {
    const result = sanitizePostContent('```\nconst x = 1;\n```');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
    expect(result).toContain('const x = 1;');
  });

  it('does not process markdown inside fenced code blocks', () => {
    const result = sanitizePostContent('```\n**bold** and *italic*\n```');
    expect(result).not.toContain('<strong>');
    expect(result).not.toContain('<em>');
  });

  // Blockquotes
  it('converts > quote to <blockquote>', () => {
    const result = sanitizePostContent('> This is a quote');
    expect(result).toContain('<blockquote>');
    expect(result).toContain('This is a quote');
  });

  it('groups consecutive > lines into one blockquote', () => {
    const result = sanitizePostContent('> Line 1\n> Line 2');
    expect(result).toContain('<blockquote>');
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
    // Should be one blockquote, not two
    expect(result.match(/<blockquote>/g)?.length).toBe(1);
  });

  // Unordered lists
  it('converts - items to <ul><li>', () => {
    const result = sanitizePostContent('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
  });

  it('converts * items to <ul><li>', () => {
    const result = sanitizePostContent('* Item A\n* Item B');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item A</li>');
    expect(result).toContain('<li>Item B</li>');
  });

  // Ordered lists
  it('converts numbered items to <ol><li>', () => {
    const result = sanitizePostContent('1. First\n2. Second');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>First</li>');
    expect(result).toContain('<li>Second</li>');
  });

  // Combined formatting
  it('handles bold inside list items', () => {
    const result = sanitizePostContent('- **Bold item**\n- Normal item');
    expect(result).toContain('<li><strong>Bold item</strong></li>');
  });

  it('handles bold and italic together (***text***)', () => {
    // Note: ***text*** at the START of a line is matched as a horizontal rule (3+ asterisks).
    // When embedded inline, it correctly renders as bold+italic.
    const result = sanitizePostContent('This is ***bold italic*** text');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });
});

// ---------------------------------------------------------------------------
// sanitizeComment
// ---------------------------------------------------------------------------

describe('sanitizeComment', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeComment('')).toBe('');
  });

  it('uses strict config (limited tags)', () => {
    const result = sanitizeComment('<h1>Big</h1><p>text</p>');
    expect(result).not.toContain('<h1');
    expect(result).toContain('<p>');
  });
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------

describe('stripHtml', () => {
  it('removes all HTML tags and returns plain text', () => {
    const result = stripHtml('<p>Hello <strong>world</strong></p>');
    expect(result).toBe('Hello world');
  });

  it('handles nested tags', () => {
    const result = stripHtml('<div><p><em>nested</em></p></div>');
    expect(result).toBe('nested');
  });
});

// ---------------------------------------------------------------------------
// hasSuspiciousContent
// ---------------------------------------------------------------------------

describe('hasSuspiciousContent', () => {
  it('detects <script', () => {
    expect(hasSuspiciousContent('<script>alert(1)</script>')).toBe(true);
  });

  it('detects javascript: protocol', () => {
    expect(hasSuspiciousContent('javascript:alert(1)')).toBe(true);
  });

  it('detects onclick= event handlers', () => {
    expect(hasSuspiciousContent('<div onclick="alert(1)">')).toBe(true);
  });

  it('detects data: URIs', () => {
    expect(hasSuspiciousContent('data:text/html,<script>alert(1)</script>')).toBe(true);
  });

  it('returns false for clean content', () => {
    expect(hasSuspiciousContent('<p>Perfectly safe content</p>')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateUrl
// ---------------------------------------------------------------------------

describe('validateUrl', () => {
  it('returns valid for a proper https URL', () => {
    const result = validateUrl('https://example.com/path');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://example.com/path');
  });

  it('rejects javascript: URLs', () => {
    const result = validateUrl('javascript:alert(1)');
    expect(result.valid).toBe(false);
  });

  it('returns invalid for empty/null input', () => {
    expect(validateUrl('').valid).toBe(false);
    expect(validateUrl(null as unknown as string).valid).toBe(false);
  });

  it('auto-adds https:// for URLs without protocol', () => {
    const result = validateUrl('example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toContain('https://');
  });
});

// ---------------------------------------------------------------------------
// validateImageUrl
// ---------------------------------------------------------------------------

describe('validateImageUrl', () => {
  it('accepts a valid image URL', () => {
    const result = validateImageUrl('https://images.hive.blog/photo.jpg');
    expect(result.valid).toBe(true);
  });

  it('rejects private IPs (localhost)', () => {
    const result = validateImageUrl('https://localhost/image.png');
    expect(result.valid).toBe(false);
  });

  it('rejects private IPs (192.168.x)', () => {
    const result = validateImageUrl('https://192.168.1.1/image.png');
    expect(result.valid).toBe(false);
  });

  it('rejects non-image URLs', () => {
    const result = validateImageUrl('https://example.com/page.html');
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTrustedImageHost
// ---------------------------------------------------------------------------

describe('isTrustedImageHost', () => {
  it('returns true for trusted host (images.hive.blog)', () => {
    expect(isTrustedImageHost('https://images.hive.blog/photo.jpg')).toBe(true);
  });

  it('returns true for another trusted host (i.imgur.com)', () => {
    expect(isTrustedImageHost('https://i.imgur.com/abc.png')).toBe(true);
  });

  it('returns false for untrusted host', () => {
    expect(isTrustedImageHost('https://evil.example.com/img.png')).toBe(false);
  });

  it('returns false for invalid URL', () => {
    expect(isTrustedImageHost('not-a-url')).toBe(false);
  });
});
