import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { BlogPostContent } from './BlogPostContent';

const BASE_URL = 'https://sportsblock.app';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found | Sportsblock' };
  }

  const url = `${BASE_URL}/blog/${post.slug}`;

  return {
    title: `${post.title} | Sportsblock Blog`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: 'Sportsblock',
      type: 'article',
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author],
      images: post.image ? [{ url: `${BASE_URL}${post.image}`, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

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

export const revalidate = 86400;

// JSON-LD is safe here — content is authored by us (not user-generated).
// Blog posts are static TypeScript files in content/blog/.
function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const readTime = estimateReadTime(post.content);
  const url = `${BASE_URL}/blog/${post.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: new Date(post.date).toISOString(),
    author: {
      '@type': 'Organization',
      name: post.author,
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sportsblock',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(post.image ? { image: `${BASE_URL}${post.image}` } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />

      <article className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-sb-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>

        <header className="mb-10">
          <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
          <p className="mb-6 text-lg text-muted-foreground">{post.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {readTime} min read
            </span>
          </div>
          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <BlogPostContent content={post.content} />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-sb-text-primary">Ready to Get Started?</h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            Join Sportsblock and start earning crypto from your sports knowledge today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 font-semibold text-[#051A14] transition-colors hover:bg-primary/90"
            >
              Sign Up Free
            </Link>
            <Link
              href="/getting-started"
              className="inline-flex items-center rounded-lg border border-sb-border px-6 py-3 font-semibold text-sb-text-primary transition-colors hover:bg-sb-turf"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Related links */}
        <div className="mt-12 border-t pt-8">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">More from the blog</h3>
          <div className="flex flex-wrap gap-4">
            {getAllPosts()
              .filter((p) => p.slug !== post.slug)
              .map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="text-sm text-primary hover:underline"
                >
                  {p.title}
                </Link>
              ))}
          </div>
        </div>
      </article>
    </div>
  );
}
