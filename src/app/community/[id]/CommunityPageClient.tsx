'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { CommunityDetail } from '@/components/community/CommunityDetail';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function CommunityPageClient() {
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
      <div className="mx-auto max-w-6xl">
        <CommunityDetail communityId={communityId} />
      </div>
    </MainLayout>
  );
}
