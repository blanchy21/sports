"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CommunitiesList } from "@/components/community/CommunitiesList";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";

export default function CommunitiesPage() {
  const { user, isLoading: isAuthLoading, authType } = useAuth();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/");
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Communities</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Discover and join communities that match your interests in sports. 
              From local supporter clubs to international fan groups, find your tribe!
            </p>
          </div>

          {canCreateCommunity && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Community
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Find Your Community</h3>
            <p className="text-sm">
              Join communities for your favorite teams, sports, and interests
            </p>
          </div>
          <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4 border border-accent/20">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Share & Discuss</h3>
            <p className="text-sm">
              Post content, engage in discussions, and connect with fans
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-500/10 to-purple-500/5 rounded-lg p-4 border border-purple-500/20">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Build Your Own</h3>
            <p className="text-sm">
              Create a community for your club, league, or sports interest
            </p>
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
