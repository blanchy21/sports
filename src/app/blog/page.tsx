import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';

const BASE_URL = 'https://sportsblock.app';

export const metadata: Metadata = {
  title: 'Blog — Sports, Crypto & Blockchain Insights | Sportsblock',
  description:
    'Guides, tutorials, and insights on earning crypto through sports content. Learn about Hive blockchain, MEDALS tokens, and the future of sports fan engagement.',
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: {
    title: 'Blog — Sports, Crypto & Blockchain Insights | Sportsblock',
    description: 'Guides, tutorials, and insights on earning crypto through sports content.',
    url: `${BASE_URL}/blog`,
    siteName: 'Sportsblock',
    type: 'website',
  },
};

export const revalidate = 86400; // ISR: regenerate every 24h

function estimateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 230));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SPORTSBLOCK
        </Link>

        <h1 className="mb-2 text-3xl font-bold">Blog</h1>
        <p className="mb-10 text-muted-foreground">
          Guides, tutorials, and insights on sports, crypto, and blockchain.
        </p>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <h2 className="mb-2 text-xl font-semibold text-foreground">{post.title}</h2>
              <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {estimateReadTime(post.content)} min read
                </span>
                <span className="ml-auto flex items-center gap-1 text-primary">
                  Read more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 border-t pt-8">
          <div className="flex flex-wrap gap-4">
            <Link href="/getting-started" className="text-sm text-primary hover:underline">
              Getting Started
            </Link>
            <Link href="/earn-crypto-sports" className="text-sm text-primary hover:underline">
              Earn Crypto
            </Link>
            <Link href="/medals-token" className="text-sm text-primary hover:underline">
              MEDALS Token
            </Link>
            <Link href="/about" className="text-sm text-primary hover:underline">
              About
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
