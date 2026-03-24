'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import { BookmarksContent } from '@/components/profile/BookmarksContent';

export default function BookmarksPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-4 py-4">
            <div className="h-24 animate-pulse rounded-lg bg-sb-stadium" />
            <div className="h-24 animate-pulse rounded-lg bg-sb-stadium" />
            <div className="h-24 animate-pulse rounded-lg bg-sb-stadium" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border bg-sb-stadium p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-sb-turf p-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to view your bookmarked posts.</p>
          </div>
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
