'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { Users, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';

interface AuthorInfo {
  username: string;
  posts: number;
  engagement: number;
}

export default function AuthorsPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery<{ success: boolean; authors: AuthorInfo[] }>({
    queryKey: ['community-authors'],
    queryFn: async () => {
      const res = await fetch('/api/authors');
      if (!res.ok) throw new Error('Failed to fetch authors');
      return res.json();
    },
  });

  const authors = data?.authors ?? [];

  return (
    <MainLayout showRightSidebar={false}>
      <div className="mx-auto max-w-4xl py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-muted"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Community Authors</h1>
                <p className="text-muted-foreground">Authors who post in Sportsblock</p>
              </div>
            </div>
          </div>
          {!isLoading && !error && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{authors.length}</div>
              <div className="text-sm text-muted-foreground">Total authors</div>
            </div>
          )}
        </div>

        {/* Content */}
        <Card className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-1/3 rounded bg-gray-300"></div>
                    <div className="h-3 w-1/2 rounded bg-gray-300"></div>
                  </div>
                  <div className="h-8 w-20 rounded bg-gray-300"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">😞</div>
              <h3 className="mb-2 text-xl font-semibold">Error Loading Authors</h3>
              <p className="mb-4 text-muted-foreground">
                There was an error loading the community authors. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : authors.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">👥</div>
              <h3 className="mb-2 text-xl font-semibold">No Authors Found</h3>
              <p className="text-muted-foreground">
                No authors have posted in the Sportsblock community yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {authors.map((author) => (
                <div
                  key={author.username}
                  className="flex items-center justify-between rounded-lg p-4 transition-colors hover:bg-muted/50"
                >
                  <div
                    className="flex flex-1 cursor-pointer items-center space-x-4"
                    onClick={() => router.push(`/user/${author.username}`)}
                  >
                    <Avatar
                      src={getHiveAvatarUrl(author.username)}
                      fallback={author.username}
                      alt={author.username}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold">@{author.username}</div>
                      <div className="text-sm text-muted-foreground">
                        {author.posts} {author.posts === 1 ? 'post' : 'posts'} · {author.engagement}{' '}
                        engagement
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/user/${author.username}`)}
                  >
                    View Profile
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
