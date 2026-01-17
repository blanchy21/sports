"use client";

import React from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { CommunityDetail } from "@/components/community/CommunityDetail";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function CommunityPage() {
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const communityId = params.id as string;

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
      <div className="max-w-6xl mx-auto">
        <CommunityDetail communityId={communityId} />
      </div>
    </MainLayout>
  );
}
