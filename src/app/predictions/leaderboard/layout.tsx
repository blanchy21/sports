import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Predictions Leaderboard | Sportsblock',
  description: 'Top predictors ranked by accuracy and earnings on Sportsblock.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
