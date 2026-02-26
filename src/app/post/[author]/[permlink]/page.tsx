import type { Metadata } from 'next';
import PostDetailClient from './PostDetailClient';
import { fetchPost } from '@/lib/hive-workerbee/content';
import type { SportsblockPost } from '@/lib/shared/types';

interface PageProps {
  params: Promise<{ author: string; permlink: string }>;
}

// Shared fetch — used by both generateMetadata and the page component
async function getPost(author: string, permlink: string): Promise<SportsblockPost | null> {
  try {
    return await fetchPost(author, permlink);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { author, permlink } = await params;
  const post = await getPost(author, permlink);

  if (post) {
    const description = post.body
      .replace(/[#*\[\]()>_~`]/g, '')
      .slice(0, 160)
      .trim();
    return {
      title: `${post.title} | Sportsblock`,
      description,
      openGraph: {
        title: post.title,
        description,
        type: 'article',
        authors: [author],
      },
      twitter: {
        card: 'summary',
        title: post.title,
        description,
      },
    };
  }

  return {
    title: `Post by @${author} | Sportsblock`,
    description: `Read this post by @${author} on Sportsblock`,
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { author, permlink } = await params;
  const post = await getPost(author, permlink);

  return <PostDetailClient initialPost={post} />;
}
