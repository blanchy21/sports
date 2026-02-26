import type { Metadata } from 'next';
import UserProfileClient from './UserProfileClient';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import type { UserAccountData } from '@/lib/hive-workerbee/account';

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getProfile(username: string): Promise<UserAccountData | null> {
  try {
    return await fetchUserAccount(username);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const account = await getProfile(username);

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

  return {
    title: `@${username} | Sportsblock`,
    description: `View @${username}'s profile on Sportsblock`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getProfile(username);

  return <UserProfileClient initialProfile={profile} />;
}
