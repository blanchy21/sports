/**
 * Blog post types and data access.
 *
 * Posts are stored as TypeScript files in content/blog/ for type safety
 * and zero-dependency static generation.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date string (YYYY-MM-DD)
  author: string;
  tags: string[];
  image?: string;
  content: string; // Markdown
}

// Import all blog posts statically for SSG.
// Add new posts here — they'll be picked up by the list page and generateStaticParams.
import earnCrypto from '../../content/blog/earn-crypto-sports-knowledge';
import vsChiliz from '../../content/blog/sportsblock-vs-chiliz';
import medalsToken from '../../content/blog/what-is-medals-token';

const ALL_POSTS: BlogPost[] = [earnCrypto, vsChiliz, medalsToken].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

export function getAllPosts(): BlogPost[] {
  return ALL_POSTS;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}
