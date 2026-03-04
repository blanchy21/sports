import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Match Threads | Sportsblock',
  description: 'Live discussion threads for ongoing sports matches.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
