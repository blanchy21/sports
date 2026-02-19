'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RepliesContent } from '@/components/profile/RepliesContent';

export default function RepliesPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user?.username) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
            <p className="text-muted-foreground">
              Please sign in to view your comments and replies.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <RepliesContent />
      </div>
    </MainLayout>
  );
}
