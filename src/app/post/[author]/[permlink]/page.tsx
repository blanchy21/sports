import { cache } from 'react';
import type { Metadata } from 'next';
import PostDetailClient from './PostDetailClient';
import { fetchPost } from '@/lib/hive-workerbee/content';
import type { SportsblockPost } from '@/lib/shared/types';

const BASE_URL = 'https://sportsblock.app';

interface PageProps {
  params: Promise<{ author: string; permlink: string }>;
}

function extractFirstImage(post: SportsblockPost): string | undefined {
  // 1. Check img_url field (set by some Hive clients)
  if (post.img_url) return post.img_url;

  // 2. Check json_metadata for image array
  try {
    const meta =
      typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : post.json_metadata;
    if (meta?.image?.[0]) return meta.image[0];
  } catch {
    /* ignore */
  }

  // 3. Extract first markdown image ![alt](url)
  const mdMatch = post.body.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch?.[1]) return mdMatch[1];

  // 4. Extract first HTML <img src="url">
  const htmlMatch = post.body.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch?.[1]) return htmlMatch[1];

  return undefined;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '') // remove images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links → text
    .replace(/[#*>_~`]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

// Wrapped with React cache() so generateMetadata and the page component
// share the result within a single server request (no duplicate fetch).
const getPost = cache(async (author: string, permlink: string): Promise<SportsblockPost | null> => {
  try {
    return await fetchPost(author, permlink);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { author, permlink } = await params;
  const post = await getPost(author, permlink);

  if (post) {
    const description = stripMarkdown(post.body).slice(0, 160);
    const image = extractFirstImage(post);
    const canonicalUrl = `${BASE_URL}/post/${author}/${permlink}`;

    return {
      title: `${post.title} | Sportsblock`,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: post.title,
        description,
        type: 'article',
        url: canonicalUrl,
        authors: [author],
        publishedTime: post.created,
        ...(image && { images: [{ url: image }] }),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title: post.title,
        description,
        ...(image && { images: [image] }),
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

  // JSON-LD uses JSON.stringify which escapes all special characters,
  // so there is no XSS risk from post content fields.
  const jsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: stripMarkdown(post.body).slice(0, 160),
        datePublished: post.created,
        image: extractFirstImage(post) || `${BASE_URL}/sportsblock-hero.png`,
        author: {
          '@type': 'Person',
          name: author,
          url: `${BASE_URL}/user/${author}`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Sportsblock',
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/sportsblock512.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${BASE_URL}/post/${author}/${permlink}`,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PostDetailClient initialPost={post} />
    </>
  );
}
