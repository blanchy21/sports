'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CommunitiesList } from '@/components/community/CommunitiesList';
import { CreateCommunityModal } from '@/components/community/CreateCommunityModal';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';

export default function CommunitiesPage() {
  const { user, isLoading: isAuthLoading, authType } = useAuth();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const handleCommunityCreated = (community: { id: string; slug: string }) => {
    // Navigate to the new community
    router.push(`/community/${community.slug}`);
  };

  // Check if user can create communities (Hive auth OR verified email)
  const canCreateCommunity = user && (authType === 'hive' || authType === 'soft');

  // Show skeleton while auth is loading (handled by loading.tsx for initial load)
  if (isAuthLoading) {
    return null; // Let loading.tsx handle it
  }

  // User not authenticated - will redirect
  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Users className="text-primary h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Communities</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Discover and join communities that match your interests in sports. From local
              supporter clubs to international fan groups, find your tribe!
            </p>
          </div>

          {canCreateCommunity && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Create Community
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-primary/20 from-primary/10 to-primary/5 rounded-lg border bg-linear-to-r p-4">
            <h3 className="text-muted-foreground mb-1 text-sm font-medium">Find Your Community</h3>
            <p className="text-sm">
              Join communities for your favorite teams, sports, and interests
            </p>
          </div>
          <div className="border-accent/20 from-accent/10 to-accent/5 rounded-lg border bg-linear-to-r p-4">
            <h3 className="text-muted-foreground mb-1 text-sm font-medium">Share & Discuss</h3>
            <p className="text-sm">Post content, engage in discussions, and connect with fans</p>
          </div>
          <div className="rounded-lg border border-purple-500/20 bg-linear-to-r from-purple-500/10 to-purple-500/5 p-4">
            <h3 className="text-muted-foreground mb-1 text-sm font-medium">Build Your Own</h3>
            <p className="text-sm">Create a community for your club, league, or sports interest</p>
          </div>
        </div>

        {/* Communities List */}
        <CommunitiesList showFilters={true} />

        {/* Create Community Modal */}
        <CreateCommunityModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCommunityCreated}
        />
      </div>
    </MainLayout>
  );
}
