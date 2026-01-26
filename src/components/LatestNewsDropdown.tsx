"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { Newspaper, ExternalLink, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { useESPNNews } from "@/hooks/useESPNNews";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./ui/Button";

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
  triggerRef
}) => {
  const {
    articles,
    isLoading,
    error,
    lastUpdated,
    refreshNews,
    isRefreshing
  } = useESPNNews({ limit: 12, enabled: isOpen });

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
      className="absolute right-0 top-full mt-2 w-[420px] bg-card border border-border rounded-lg shadow-xl z-50 max-h-[32rem] overflow-hidden"
      data-testid="news-dropdown"
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
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
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </p>
        )}
      </div>

      {/* News List */}
      <div className="max-h-[24rem] overflow-y-auto">
        {isLoading && !isRefreshing ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Loading latest news...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshNews()}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Newspaper className="h-8 w-8 mx-auto mb-3 opacity-30" />
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
                className="block w-full p-4 hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {article.image?.url ? (
                      <div className="relative w-20 h-14 rounded-md overflow-hidden bg-muted">
                        <Image
                          src={article.image.url}
                          alt={article.headline}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-14 rounded-md bg-muted flex items-center justify-center text-2xl">
                        {getSportIcon(article.sport)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getSportIcon(article.sport)}</span>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {article.sport}
                      </span>
                    </div>

                    <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {article.headline}
                    </h4>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(article.published), { addSuffix: true })}
                      </p>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by ESPN</span>
          <a
            href="https://www.espn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-primary transition-colors"
          >
            View all on ESPN
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};
