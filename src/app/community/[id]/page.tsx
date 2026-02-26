import type { Metadata } from 'next';
import CommunityPageClient from './CommunityPageClient';
import { getCommunity } from './getCommunity';

interface PageProps {
  params: Promise<{ id: string }>;
}

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

export default function CommunityPage() {
  return <CommunityPageClient />;
}
