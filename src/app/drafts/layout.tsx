import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drafts | Sportsblock',
  description: 'Your unpublished draft posts.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
