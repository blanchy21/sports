'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/core/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { LazyLandingHero, LazyLandingSections } from '@/components/lazy/LazyLandingContent';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/new');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <Loading fullPage text="Loading..." />;
  }

  if (user) {
    return null;
  }

  return (
    <div className="landing-dark min-h-screen overflow-x-hidden bg-background">
      {/* Hero Section — lazy-loaded to defer framer-motion from initial bundle */}
      <LazyLandingHero />

      {/* Lazy load all sections below the fold */}
      <LazyLandingSections />
    </div>
  );
}
