'use client';

import React, { Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader2, FileEdit, Calendar } from 'lucide-react';
import { DraftsContent } from '@/components/profile/DraftsContent';
import { ScheduledPostsContent } from '@/components/profile/ScheduledPostsContent';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/client';

function DraftsPageContent() {
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') === 'scheduled' ? 'scheduled' : 'drafts';

  const setTab = (tab: 'drafts' | 'scheduled') => {
    router.replace(tab === 'drafts' ? '/drafts' : '/drafts?tab=scheduled');
  };

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

  if (!user) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to view your draft posts.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          <button
            onClick={() => setTab('drafts')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'drafts'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <FileEdit className="h-4 w-4" />
            Drafts
          </button>
          <button
            onClick={() => setTab('scheduled')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'scheduled'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Calendar className="h-4 w-4" />
            Scheduled
          </button>
        </div>

        {activeTab === 'drafts' ? <DraftsContent /> : <ScheduledPostsContent />}
      </div>
    </MainLayout>
  );
}

export default function DraftsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </MainLayout>
      }
    >
      <DraftsPageContent />
    </Suspense>
  );
}
