import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Replies | Sportsblock',
  description: 'View and manage your comment replies.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
