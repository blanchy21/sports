'use client';

import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { UpgradeIncentive, UpgradeIncentiveBanner } from '@/components/upgrade/UpgradeIncentive';

interface PostLimitInfo {
  currentCount: number;
  limit: number;
  remaining: number;
  isNearLimit: boolean;
  upgradePrompt: string | null;
}

interface PostPublishedModalProps {
  postLimitInfo: PostLimitInfo | null;
  onViewFeed: () => void;
  onConnectHive: () => void;
}

export function PostPublishedModal({
  postLimitInfo,
  onViewFeed,
  onConnectHive,
}: PostPublishedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
            <Send className="h-6 w-6 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Post Published!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your post is now live on Sportsblock.
          </p>
        </div>

        {/* Post Limit Warning */}
        {postLimitInfo && postLimitInfo.isNearLimit && (
          <div className="mb-4">
            <UpgradeIncentiveBanner
              type={postLimitInfo.remaining <= 5 ? 'storage-critical' : 'storage-warning'}
              postsRemaining={postLimitInfo.remaining}
              totalPosts={postLimitInfo.limit}
            />
          </div>
        )}

        {/* Upgrade Incentive */}
        <UpgradeIncentive type="post-published" className="mb-4" dismissible={false} />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onViewFeed} className="flex-1">
            View Feed
          </Button>
          <Button onClick={onConnectHive} className="flex-1">
            Connect Hive
          </Button>
        </div>
      </div>
    </div>
  );
}
