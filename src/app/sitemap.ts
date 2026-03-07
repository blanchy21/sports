import { MetadataRoute } from 'next';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';

const BASE_URL = 'https://sportsblock.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/feed`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/communities`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sportsbites`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/new`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/auth`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/earn-crypto-sports`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/start-sports-blog`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sportsblock-vs-chiliz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/medals-token`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Legal pages
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/cookies`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/community-guidelines`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/dmca`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Main community page
  const communityPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/community/hive-115814`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/community/hive-115814/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/community/hive-115814/members`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.5,
    },
  ];

  // Fetch dynamic posts from Hive (paginate to collect up to 500)
  const postEntries: MetadataRoute.Sitemap = [];
  const authors = new Set<string>();

  try {
    let cursor: string | undefined;
    const MAX_POSTS = 500;

    while (postEntries.length < MAX_POSTS) {
      const remaining = MAX_POSTS - postEntries.length;
      const result = await fetchSportsblockPosts({
        sort: 'created',
        limit: Math.min(remaining, 100),
        ...(cursor && { before: cursor }),
      });

      for (const post of result.posts) {
        postEntries.push({
          url: `${BASE_URL}/post/${post.author}/${post.permlink}`,
          lastModified: new Date(post.created),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
        authors.add(post.author);
      }

      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }
  } catch {
    // If Hive API fails, return sitemap with static pages only
  }

  // Generate user profile URLs from discovered authors
  const userEntries: MetadataRoute.Sitemap = Array.from(authors).map((username) => ({
    url: `${BASE_URL}/user/${username}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...legalPages, ...communityPages, ...postEntries, ...userEntries];
}
