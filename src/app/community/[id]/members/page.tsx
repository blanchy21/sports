import type { Metadata } from 'next';
import CommunityMembersClient from './CommunityMembersClient';
import { getCommunity } from '../getCommunity';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const community = await getCommunity(id);

  if (community) {
    return {
      title: `Members of ${community.name} | Sportsblock`,
      description: `View members of ${community.name} on Sportsblock`,
    };
  }

  return {
    title: 'Community Members | Sportsblock',
    description: 'View community members on Sportsblock.',
  };
}

export default function CommunityMembersPage() {
  return <CommunityMembersClient />;
}
