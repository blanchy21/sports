import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Predictions | Sportsblock',
  description: 'Make sports predictions, stake MEDALS tokens, and compete with the community.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
