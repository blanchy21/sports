import type { Metadata } from 'next';
import PostDetailClient from './PostDetailClient';
import { fetchPost } from '@/lib/hive-workerbee/content';

interface PageProps {
  params: Promise<{ author: string; permlink: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { author, permlink } = await params;
  try {
    const post = await fetchPost(author, permlink);
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
  } catch {
    // Metadata fetch failed — fall through to defaults
  }

  return {
    title: `Post by @${author} | Sportsblock`,
    description: `Read this post by @${author} on Sportsblock`,
  };
}

export default function PostDetailPage() {
  return <PostDetailClient />;
}
