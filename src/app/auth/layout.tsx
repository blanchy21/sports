import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Sportsblock',
  description:
    'Sign in to Sportsblock to earn crypto from sports content. Connect with Hive Keychain or sign up with Google.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
