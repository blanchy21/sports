import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sportsbites — Quick Sports Takes | Sportsblock',
  description: 'Share quick sports takes and hot opinions with the community.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
