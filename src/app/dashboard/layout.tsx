import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Sportsblock',
  description: 'Your personal Sportsblock dashboard with stats and activity overview.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
