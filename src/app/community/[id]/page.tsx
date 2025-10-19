"use client";

import React from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { CommunityDetail } from "@/components/community/CommunityDetail";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";

export default function CommunityPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const router = useRouter();
  const communityId = params.id as string;

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
      <div className="max-w-6xl mx-auto">
        <CommunityDetail communityId={communityId} />
      </div>
    </MainLayout>
  );
}
