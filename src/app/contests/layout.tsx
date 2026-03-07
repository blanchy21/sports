import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contests | Sportsblock',
  description: 'Compete in sports prediction contests and earn rewards on Sportsblock.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
