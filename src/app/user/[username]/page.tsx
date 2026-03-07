import { cache } from 'react';
import type { Metadata } from 'next';
import UserProfileClient from './UserProfileClient';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import type { UserAccountData } from '@/lib/hive-workerbee/account';

const BASE_URL = 'https://sportsblock.app';

interface PageProps {
  params: Promise<{ username: string }>;
}

// Wrapped with React cache() so generateMetadata and the page component
// share the result within a single server request (no duplicate fetch).
const getProfile = cache(async (username: string): Promise<UserAccountData | null> => {
  try {
    return await fetchUserAccount(username);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const account = await getProfile(username);

  if (account) {
    const description = account.profile?.about
      ? account.profile.about.slice(0, 160)
      : `@${username} on Sportsblock`;
    const displayName = account.profile?.name || username;
    const canonicalUrl = `${BASE_URL}/user/${username}`;
    return {
      title: `${displayName} (@${username}) | Sportsblock`,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: `${displayName} (@${username})`,
        description,
        type: 'profile',
        url: canonicalUrl,
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

  const displayName = profile?.profile?.name || username;
  const profileUrl = `${BASE_URL}/user/${username}`;

  // JSON-LD: Person + BreadcrumbList. JSON.stringify escapes all
  // special characters, so there is no XSS risk from profile fields.
  const jsonLd = profile
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Person',
            name: displayName,
            url: profileUrl,
            ...(profile.profile?.about && { description: profile.profile.about }),
            ...(profile.profile?.profileImage && { image: profile.profile.profileImage }),
            ...(profile.profile?.website && { sameAs: [profile.profile.website] }),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: BASE_URL,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Users',
                item: `${BASE_URL}/user`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: displayName,
                item: profileUrl,
              },
            ],
          },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <UserProfileClient initialProfile={profile} />
    </>
  );
}
