import { cache } from 'react';
import type { Metadata } from 'next';
import CommunityPageClient from './CommunityPageClient';
import { getCommunity as fetchCommunity } from './getCommunity';

const BASE_URL = 'https://sportsblock.app';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Wrapped with React cache() so generateMetadata and the page component
// share the result within a single server request (no duplicate fetch).
const getCommunity = cache(async (id: string) => fetchCommunity(id));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const community = await getCommunity(id);

  if (community) {
    const description = community.about?.slice(0, 160) || `${community.name} on Sportsblock`;
    return {
      title: `${community.name} | Sportsblock`,
      description,
      openGraph: {
        title: community.name,
        description,
        type: 'profile',
        ...(community.avatar && { images: [{ url: community.avatar }] }),
      },
    };
  }

  return {
    title: 'Community | Sportsblock',
    description: 'View this community on Sportsblock.',
  };
}

export default async function CommunityPage({ params }: PageProps) {
  const { id } = await params;
  const community = await getCommunity(id);

  // JSON-LD: BreadcrumbList. JSON.stringify escapes all special
  // characters, so there is no XSS risk from community fields.
  const jsonLd = community
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: BASE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Communities',
            item: `${BASE_URL}/communities`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: community.name,
            item: `${BASE_URL}/community/${id}`,
          },
        ],
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
      <CommunityPageClient />
    </>
  );
}
