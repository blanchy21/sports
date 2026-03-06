'use client';

import React, { useState } from 'react';
import { Button } from '@/components/core/Button';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useScheduledPosts, useCancelScheduledPost } from '@/lib/react-query/queries/useScheduledPosts';

const statusConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  pending: { icon: Clock, label: 'Pending', className: 'text-amber-500 bg-amber-500/10' },
  published: { icon: CheckCircle, label: 'Published', className: 'text-green-500 bg-green-500/10' },
  failed: { icon: AlertCircle, label: 'Failed', className: 'text-destructive bg-destructive/10' },
  cancelled: { icon: XCircle, label: 'Cancelled', className: 'text-muted-foreground bg-muted' },
};

export function ScheduledPostsContent() {
  const router = useRouter();
  const { data: posts, isLoading, error } = useScheduledPosts();
  const cancelMutation = useCancelScheduledPost();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post?')) return;
    setCancellingId(id);
    try {
      await cancelMutation.mutateAsync(id);
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading scheduled posts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-destructive">
          {error instanceof Error ? error.message : 'Failed to load scheduled posts'}
        </p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <Calendar className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No scheduled posts</h3>
        <p className="mb-4 text-muted-foreground">
          Schedule a post from the publish page and it will appear here.
        </p>
        <Button onClick={() => router.push('/publish')}>Create a Post</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const status = statusConfig[post.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        const scheduledDate = new Date(post.scheduledAt);

        return (
          <div
            key={post.id}
            className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold">{post.postData.title}</h3>

                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {scheduledDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {scheduledDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {post.postData.sportCategory && (
                    <>
                      <span>&bull;</span>
                      <span>{post.postData.sportCategory}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>

                {post.status === 'failed' && post.error && (
                  <p className="mt-2 rounded bg-destructive/5 p-2 text-sm text-destructive">
                    {post.error}
                  </p>
                )}
              </div>

              <div className="ml-4 flex items-center gap-2">
                {post.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleCancel(post.id)}
                    disabled={cancellingId === post.id}
                  >
                    {cancellingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
