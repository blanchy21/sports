import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earn Rewards | Sportsblock',
  description:
    'Discover how to earn MEDALS tokens and crypto rewards by creating sports content on Sportsblock.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
