import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Followers | Sportsblock',
  description: 'People who follow you on Sportsblock.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
