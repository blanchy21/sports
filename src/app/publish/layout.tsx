import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publish | Sportsblock',
  description: 'Create and publish a new sports article to the Hive blockchain.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
