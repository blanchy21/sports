"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CommunitiesList } from "@/components/community/CommunitiesList";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function CommunitiesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  // Show nothing while auth is loading or if user is not authenticated (will redirect)
  if (isAuthLoading || !user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Communities</h1>
          <p className="text-muted-foreground">
            Discover and join communities that match your interests in sports and blockchain.
          </p>
        </div>

        {/* Communities List */}
        <CommunitiesList />
      </div>
    </MainLayout>
  );
}
