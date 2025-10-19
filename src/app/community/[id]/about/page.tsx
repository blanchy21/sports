"use client";

import React from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { CommunityAbout } from "@/components/community/CommunityAbout";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function CommunityAboutPage() {
  const params = useParams();
  const { user } = useAuth();
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
      <div className="max-w-4xl mx-auto">
        <CommunityAbout communityId={communityId} />
      </div>
    </MainLayout>
  );
}
