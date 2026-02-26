import type { Metadata } from 'next';
import CommunityAboutClient from './CommunityAboutClient';
import { getCommunity } from '../getCommunity';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const community = await getCommunity(id);

  if (community) {
    return {
      title: `About ${community.name} | Sportsblock`,
      description: community.about?.slice(0, 160) || `About ${community.name} on Sportsblock`,
    };
  }

  return {
    title: 'About Community | Sportsblock',
    description: 'Learn about this community on Sportsblock.',
  };
}

export default function CommunityAboutPage() {
  return <CommunityAboutClient />;
}
