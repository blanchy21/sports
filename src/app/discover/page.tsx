import type { Metadata } from 'next';
import DiscoverClient from './DiscoverClient';
import { fetchTrendingPosts } from '@/lib/hive-workerbee/content';
import type { SportsblockPost } from '@/lib/shared/types';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Discover Sports | Sportsblock',
  description: 'Discover trending sports content and communities on Sportsblock.',
};

async function getTrendingPosts(): Promise<SportsblockPost[]> {
  try {
    return await fetchTrendingPosts(20);
  } catch (error) {
    logger.error('Failed to fetch trending posts for discover page', 'DiscoverPage', error);
    return [];
  }
}

export default async function DiscoverPage() {
  const initialPosts = await getTrendingPosts();

  return <DiscoverClient initialPosts={initialPosts} />;
}
