'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { CommunityMembers } from '@/components/community/CommunityMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function CommunityMembersClient() {
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const communityId = params.id as string;

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      // Grace period to handle slow session cookie propagation after login
      // (Keychain mobile WebView cookie-jar sync, slow networks, reloads).
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl">
        <CommunityMembers communityId={communityId} />
      </div>
    </MainLayout>
  );
}
