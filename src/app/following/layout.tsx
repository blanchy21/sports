import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Following | Sportsblock',
  description: 'People you follow on Sportsblock.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
