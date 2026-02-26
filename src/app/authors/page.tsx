import type { Metadata } from 'next';
import AuthorsClient from './AuthorsClient';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';

export const metadata: Metadata = {
  title: 'Community Authors | Sportsblock',
  description: 'Discover authors who post sports content on Sportsblock.',
};

// Revalidate every 2 minutes (matches API cache headers)
export const revalidate = 120;

interface AuthorInfo {
  username: string;
  posts: number;
  engagement: number;
}

const PAGE_SIZE = 20;
const MAX_PAGES = 5;

async function getAuthors(): Promise<AuthorInfo[]> {
  try {
    const authorMap: Record<string, AuthorInfo> = {};

    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await fetchSportsblockPosts({
        limit: PAGE_SIZE,
        sort: 'created',
        before: cursor,
      });

      for (const post of result.posts) {
        const author = post.author;
        if (!author || typeof author !== 'string') continue;

        if (!authorMap[author]) {
          authorMap[author] = { username: author, posts: 0, engagement: 0 };
        }

        authorMap[author].posts += 1;
        authorMap[author].engagement += (post.children || 0) * 2 + (post.net_votes || 0);
      }

      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }

    return Object.values(authorMap).sort((a, b) => b.engagement - a.engagement);
  } catch {
    return [];
  }
}

export default async function AuthorsPage() {
  const initialAuthors = await getAuthors();

  return <AuthorsClient initialAuthors={initialAuthors} />;
}
