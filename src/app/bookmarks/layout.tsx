import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bookmarks | Sportsblock',
  description: 'Your saved posts and sportsbites for later reading.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
