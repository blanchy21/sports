"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CommunitiesList } from "@/components/community/CommunitiesList";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";

export default function CommunitiesPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return null; // Will redirect
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
