'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { Newspaper, ExternalLink, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { useESPNNews } from '@/features/sports/hooks/useESPNNews';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/core/Button';

interface LatestNewsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const SPORT_ICONS: Record<string, string> = {
  NFL: '🏈',
  NBA: '🏀',
  MLB: '⚾',
  NHL: '🏒',
  MLS: '⚽',
  'Premier League': '⚽',
  'La Liga': '⚽',
  Tennis: '🎾',
  PGA: '⛳',
  UFC: '🥊',
  F1: '🏎️',
};

export const LatestNewsDropdown: React.FC<LatestNewsDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const { articles, isLoading, error, lastUpdated, refreshNews, isRefreshing } = useESPNNews({
    limit: 12,
    enabled: isOpen,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // Use 'click' instead of 'mousedown' to allow links to work
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const getSportIcon = (sport: string) => {
    return SPORT_ICONS[sport] || '🏆';
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 max-h-[32rem] w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-xl"
      data-testid="news-dropdown"
    >
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Latest Sports News</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshNews()}
              disabled={isRefreshing}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <p className="mt-1 flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </p>
        )}
      </div>

      {/* News List */}
      <div className="max-h-[24rem] overflow-y-auto">
        {isLoading && !isRefreshing ? (
          <div className="p-8 text-center">
            <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading latest news...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refreshNews()} className="mt-3">
              Try Again
            </Button>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Newspaper className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p className="text-sm">No news available</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block w-full p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {article.image?.url ? (
                      <div className="relative h-14 w-20 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={article.image.url}
                          alt={article.headline}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-20 items-center justify-center rounded-md bg-muted text-2xl">
                        {getSportIcon(article.sport)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm">{getSportIcon(article.sport)}</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                        {article.sport}
                      </span>
                    </div>

                    <h4 className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {article.headline}
                    </h4>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(article.published), { addSuffix: true })}
                      </p>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by ESPN</span>
          <a
            href="https://www.espn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center transition-colors hover:text-primary"
          >
            View all on ESPN
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
