import { MetadataRoute } from 'next';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';
import { getAllPosts } from '@/lib/blog';

const BASE_URL = 'https://sportsblock.app';

// Keep sitemap focused on high-value pages to maximize crawl budget.
// Google deprioritizes sites that submit hundreds of thin/dynamic URLs.
const MAX_POSTS = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages (removed /auth and /new — utility pages with no indexable content)
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

  // Fetch recent posts (capped to focus crawl budget on best content)
  const postEntries: MetadataRoute.Sitemap = [];

  try {
    const result = await fetchSportsblockPosts({
      sort: 'created',
      limit: MAX_POSTS,
    });

    for (const post of result.posts) {
      postEntries.push({
        url: `${BASE_URL}/post/${post.author}/${post.permlink}`,
        lastModified: new Date(post.created),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    // If Hive API fails, return sitemap with static pages only
  }

  // Blog posts
  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  return [
    ...staticPages,
    ...blogIndex,
    ...blogEntries,
    ...legalPages,
    ...communityPages,
    ...postEntries,
  ];
}
