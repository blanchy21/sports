'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComposeSportsbite } from '@/components/sportsbites';
import { PredictionsFeed } from '@/components/predictions';
import { useAuth } from '@/contexts/AuthContext';
import { useMedalsBalance } from '@/lib/react-query/queries/useMedals';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Target, ChevronDown, Plus, Medal } from 'lucide-react';
import { cn } from '@/lib/utils/client';

export default function PredictionsPage() {
  const { user, hiveUser, isLoading: isAuthLoading, authType } = useAuth();
  const walletUsername = hiveUser?.username || user?.hiveUsername;
  const { data: medalsBalance } = useMedalsBalance(walletUsername);
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 150);
      return () => clearTimeout(timer);
    }
    if (!isAuthLoading && user && authType === 'soft' && !user.onboardingCompleted) {
      router.replace('/onboarding/guide');
    }
  }, [user, isAuthLoading, authType, router]);

  if (isAuthLoading) return null;
  if (!user) return null;

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur-xl">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 shadow-lg">
                <Target className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-2xl font-bold">
                  Predictions
                </h1>
                <p className="text-sm text-muted-foreground">Stake MEDALS on sports outcomes</p>
              </div>
            </div>
            {medalsBalance && (
              <Link
                href="/wallet"
                className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
              >
                <Medal className="h-3.5 w-3.5" />
                <span>{parseFloat(medalsBalance.liquid).toFixed(0)}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Collapsible create prediction section */}
        <div className="mb-6">
          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Plus
                className={cn(
                  'h-4 w-4 text-amber-500 transition-transform duration-200',
                  isCreateOpen && 'rotate-45'
                )}
              />
              Create a Prediction
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isCreateOpen && 'rotate-180'
              )}
            />
          </button>
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-200 ease-in-out',
              isCreateOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            )}
          >
            <div className="overflow-hidden">
              <div className="pt-2">
                <ComposeSportsbite predictionOnly />
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        <PredictionsFeed />
      </div>
    </MainLayout>
  );
}
