'use client';

import React, { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { DraftsContent } from '@/components/profile/DraftsContent';

export default function DraftsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading) {
    return null;
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
          <p className="mb-4 text-muted-foreground">Please sign in to view your draft posts.</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <DraftsContent />
      </div>
    </MainLayout>
  );
}
