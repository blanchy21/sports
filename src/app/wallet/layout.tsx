import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallet | Sportsblock',
  description: 'Manage your Hive tokens, MEDALS balance, and transaction history.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
