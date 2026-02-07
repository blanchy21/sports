import type { Metadata } from 'next';
import UserProfileClient from './UserProfileClient';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const account = await fetchUserAccount(username);
    if (account) {
      const description = account.profile?.about
        ? account.profile.about.slice(0, 160)
        : `@${username} on Sportsblock`;
      const displayName = account.profile?.name || username;
      return {
        title: `${displayName} (@${username}) | Sportsblock`,
        description,
        openGraph: {
          title: `${displayName} (@${username})`,
          description,
          type: 'profile',
          ...(account.profile?.profileImage && {
            images: [{ url: account.profile.profileImage }],
          }),
        },
      };
    }
  } catch {
    // Metadata fetch failed — fall through to defaults
  }

  return {
    title: `@${username} | Sportsblock`,
    description: `View @${username}'s profile on Sportsblock`,
  };
}

export default function UserProfilePage() {
  return <UserProfileClient />;
}
