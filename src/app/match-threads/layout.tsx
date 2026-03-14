import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/MainLayout';

export const metadata: Metadata = {
  title: 'Match Threads | Sportsblock',
  description: 'Live discussion threads for ongoing sports matches.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
