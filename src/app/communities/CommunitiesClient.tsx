'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CommunitiesList } from '@/components/community/CommunitiesList';
import { CreateCommunityModal } from '@/components/community/CreateCommunityModal';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';

export default function CommunitiesClient() {
  const { user, isLoading: isAuthLoading, authType } = useAuth();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const handleCommunityCreated = (community: { id: string; slug: string }) => {
    router.push(`/community/${community.slug}`);
  };

  const canCreateCommunity = user && (authType === 'hive' || authType === 'soft');

  if (isAuthLoading || !user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Communities</h1>
            </div>
            <p className="max-w-2xl text-muted-foreground">
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
          <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-4">
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">Find Your Community</h3>
            <p className="text-sm">
              Join communities for your favorite teams, sports, and interests
            </p>
          </div>
          <div className="rounded-lg border border-accent/20 bg-gradient-to-r from-accent/10 to-accent/5 p-4">
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">Share & Discuss</h3>
            <p className="text-sm">Post content, engage in discussions, and connect with fans</p>
          </div>
          <div className="rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-purple-500/5 p-4">
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">Build Your Own</h3>
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
