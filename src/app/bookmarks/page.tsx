'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { BookmarksContent } from '@/components/profile/BookmarksContent';

export default function BookmarksPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
          <p className="mb-4 text-muted-foreground">
            Please sign in to view your bookmarked posts.
          </p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <BookmarksContent />
      </div>
    </MainLayout>
  );
}
