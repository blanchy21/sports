'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { CommunityAbout } from '@/components/community/CommunityAbout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function CommunityAboutClient() {
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const communityId = params.id as string;

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl">
        <CommunityAbout communityId={communityId} />
      </div>
    </MainLayout>
  );
}
