import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feed | Sportsblock',
  description: 'Your personalized sports content feed.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
