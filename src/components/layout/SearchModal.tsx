'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Zap } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { logger } from '@/lib/logger';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';

type SearchResult = {
  username: string;
  displayName: string;
  avatar?: string;
  reputation?: string;
  followers: number;
  following: number;
  isHiveUser?: boolean;
};

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (searchQuery && searchQuery.length >= 3) {
        setIsSearching(true);
        try {
          const results: SearchResult[] = [];

          const [hiveResult, softResult] = await Promise.allSettled([
            fetchUserAccount(searchQuery).catch(() => null),
            fetch(`/api/soft/users?search=${encodeURIComponent(searchQuery)}`, {
              signal: controller.signal,
            })
              .then((r) => (r.ok ? r.json() : { users: [] }))
              .catch(() => ({ users: [] })),
          ]);

          if (controller.signal.aborted) return;

          if (hiveResult.status === 'fulfilled' && hiveResult.value) {
            const accountData = hiveResult.value;
            results.push({
              username: searchQuery,
              displayName: accountData.profile?.name || searchQuery,
              avatar: accountData.profile?.profileImage,
              reputation: accountData.reputationFormatted,
              followers: accountData.stats?.followers || 0,
              following: accountData.stats?.following || 0,
              isHiveUser: true,
            });
          }

          if (softResult.status === 'fulfilled' && softResult.value?.users?.length > 0) {
            softResult.value.users.forEach(
              (user: { username: string; displayName: string; avatarUrl?: string }) => {
                if (
                  !results.some((r) => r.username.toLowerCase() === user.username.toLowerCase())
                ) {
                  results.push({
                    username: user.username,
                    displayName: user.displayName || user.username,
                    avatar: user.avatarUrl,
                    followers: 0,
                    following: 0,
                    isHiveUser: false,
                  });
                }
              }
            );
          }

          if (!controller.signal.aborted) {
            setSearchResults(results);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            logger.error('Search error', 'SearchModal', error);
            setSearchResults([]);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleUserClick = (username: string) => {
    router.push(`/user/${username}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-2xl">
        <div className="overflow-hidden rounded-lg border bg-card shadow-2xl">
          <div className="flex items-center space-x-4 border-b p-4">
            <Search className="h-6 w-6 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-none bg-transparent text-lg outline-none"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto p-4">
            {isSearching ? (
              <div className="py-8 text-center text-muted-foreground">Searching...</div>
            ) : searchQuery.length < 3 ? (
              <div className="py-8 text-center text-muted-foreground">
                Start typing to search for users...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <button
                    key={result.username}
                    onClick={() => handleUserClick(result.username)}
                    className="flex w-full items-center space-x-3 rounded-lg p-3 transition-colors hover:bg-muted"
                  >
                    <Avatar
                      src={result.avatar}
                      fallback={result.username}
                      alt={result.displayName}
                      size="md"
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {result.displayName || result.username}
                        </span>
                        {result.isHiveUser ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            <Zap className="h-2.5 w-2.5" />
                            Hive
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            Sportsblock
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">@{result.username}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {result.isHiveUser ? `${result.followers || 0} followers` : ''}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No user found with that username
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
