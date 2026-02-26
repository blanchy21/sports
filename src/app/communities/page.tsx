import type { Metadata } from 'next';
import CommunitiesClient from './CommunitiesClient';

export const metadata: Metadata = {
  title: 'Communities | Sportsblock',
  description:
    'Discover and join sports communities on Sportsblock. Find your tribe from local supporter clubs to international fan groups.',
};

export default function CommunitiesPage() {
  return <CommunitiesClient />;
}
