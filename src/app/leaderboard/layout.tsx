import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MEDALS Leaderboard | Sportsblock',
  description: "See who's earning the most MEDALS tokens on Sportsblock.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
